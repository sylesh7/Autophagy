import {
  AppsV1Api,
  CoreV1Api,
  KubeConfig,
  Metrics,
  VersionApi,
  type PodMetric,
  type V1Pod,
} from "@kubernetes/client-node";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { cpuToMillicores, memoryToBytes } from "./quantity.js";
import type { PodObservation } from "../types.js";
import { parseActivity } from "../watcher/activity.js";

const log = logger("k8s");

/**
 * Note on the client API: @kubernetes/client-node v2 takes a single request
 * object per call and returns the deserialised body directly. The published
 * README still shows the pre-v1 positional-args + { body } wrapper form, which
 * does not compile against v2 — this module follows the shipped types.
 */

const kc = new KubeConfig();
kc.loadFromDefault();

const knownContexts = kc.getContexts().map((c) => c.name);
if (!knownContexts.includes(config.KUBE_CONTEXT)) {
  throw new Error(
    `Kube context "${config.KUBE_CONTEXT}" not found in kubeconfig. ` +
      `Available: ${knownContexts.length ? knownContexts.join(", ") : "(none — is your cluster running?)"}. ` +
      `Start one with: npm run cluster:up`,
  );
}
kc.setCurrentContext(config.KUBE_CONTEXT);

export const coreApi = kc.makeApiClient(CoreV1Api);
export const appsApi = kc.makeApiClient(AppsV1Api);
export const versionApi = kc.makeApiClient(VersionApi);
export const metricsClient = new Metrics(kc);

/** Boot-time proof that a real cluster is reachable. Throws if it is not. */
export async function assertClusterReachable(): Promise<{
  serverVersion: string;
  nodeCount: number;
  metricsServerReady: boolean;
}> {
  const version = await versionApi.getCode();
  const nodes = await coreApi.listNode();

  let metricsServerReady = false;
  try {
    await metricsClient.getNodeMetrics();
    metricsServerReady = true;
  } catch (err) {
    log.warn(
      "metrics-server is not answering. Autophagy cannot measure actual usage " +
        "without it and will not invent numbers. Enable it with: " +
        "minikube addons enable metrics-server",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    serverVersion: version.gitVersion ?? "unknown",
    nodeCount: nodes.items.length,
    metricsServerReady,
  };
}

function sumContainerRequests(pod: V1Pod): { cpuMilli: number; memoryBytes: number } {
  let cpuMilli = 0;
  let memoryBytes = 0;
  for (const container of pod.spec?.containers ?? []) {
    const requests = container.resources?.requests;
    if (requests?.cpu) cpuMilli += cpuToMillicores(requests.cpu);
    if (requests?.memory) memoryBytes += memoryToBytes(requests.memory);
  }
  return { cpuMilli, memoryBytes };
}

function sumMetricUsage(metric: PodMetric): { cpuMilli: number; memoryBytes: number } {
  let cpuMilli = 0;
  let memoryBytes = 0;
  for (const container of metric.containers) {
    cpuMilli += cpuToMillicores(container.usage.cpu);
    memoryBytes += memoryToBytes(container.usage.memory);
  }
  return { cpuMilli, memoryBytes };
}

/** Read an agent's self-reported activity from its actual stdout. */
async function readActivity(podName: string): Promise<PodObservation["activity"]> {
  try {
    const raw = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace: config.KUBE_NAMESPACE,
      tailLines: 400,
      timestamps: false,
    });
    return parseActivity(raw);
  } catch (err) {
    // A pod that has not produced logs yet is a real state, not an error to mask.
    log.warn(`could not read logs for ${podName}`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * One real polling window: live pod specs joined to live metrics-server usage.
 * Pods without a metrics sample yet report null usage rather than a guess.
 */
export async function takeSnapshot(): Promise<{
  takenAt: string;
  namespace: string;
  nodeCount: number;
  observations: PodObservation[];
}> {
  const namespace = config.KUBE_NAMESPACE;
  const [podList, nodes] = await Promise.all([
    coreApi.listNamespacedPod({ namespace }),
    coreApi.listNode(),
  ]);

  let metricsByPod = new Map<string, PodMetric>();
  try {
    const podMetrics = await metricsClient.getPodMetrics(namespace);
    metricsByPod = new Map(podMetrics.items.map((m) => [m.metadata.name, m]));
  } catch (err) {
    log.error(
      "metrics-server query failed — actual usage is unavailable this window",
      err instanceof Error ? err.message : err,
    );
  }

  const now = Date.now();
  const observations = await Promise.all(
    podList.items.map(async (pod): Promise<PodObservation> => {
      const name = pod.metadata?.name ?? "(unnamed)";
      const requested = sumContainerRequests(pod);
      const metric = metricsByPod.get(name);
      const actual = metric ? sumMetricUsage(metric) : null;
      const startedAt = pod.status?.startTime
        ? new Date(pod.status.startTime).toISOString()
        : null;

      return {
        name,
        uid: pod.metadata?.uid ?? name,
        namespace,
        phase: pod.status?.phase ?? "Unknown",
        labels: pod.metadata?.labels ?? {},
        annotations: pod.metadata?.annotations ?? {},
        startedAt,
        ageSeconds: startedAt ? Math.max(0, (now - Date.parse(startedAt)) / 1000) : 0,
        requestedCpuMilli: requested.cpuMilli,
        requestedMemoryBytes: requested.memoryBytes,
        actualCpuMilli: actual?.cpuMilli ?? null,
        actualMemoryBytes: actual?.memoryBytes ?? null,
        cpuUtilisation:
          actual && requested.cpuMilli > 0 ? actual.cpuMilli / requested.cpuMilli : null,
        memoryUtilisation:
          actual && requested.memoryBytes > 0
            ? actual.memoryBytes / requested.memoryBytes
            : null,
        restartCount:
          pod.status?.containerStatuses?.reduce((n, cs) => n + (cs.restartCount ?? 0), 0) ?? 0,
        activity: pod.status?.phase === "Running" ? await readActivity(name) : null,
      };
    }),
  );

  return {
    takenAt: new Date().toISOString(),
    namespace,
    nodeCount: nodes.items.length,
    observations,
  };
}

export type PodLiveness = "GONE" | "TERMINATING" | "PRESENT";

/**
 * Re-read a pod's actual state after acting on it.
 *
 * Deleting a pod does not remove it immediately — Kubernetes sets a deletion
 * timestamp and lets the container shut down gracefully first. A plain
 * "does it exist" check therefore reports the pod as present straight after a
 * delete that in fact succeeded, which reads like a failure. Distinguishing
 * TERMINATING from PRESENT lets the dashboard state what really happened.
 */
export async function podLiveness(podName: string): Promise<PodLiveness> {
  try {
    const pod = await coreApi.readNamespacedPod({
      name: podName,
      namespace: config.KUBE_NAMESPACE,
    });
    return pod.metadata?.deletionTimestamp ? "TERMINATING" : "PRESENT";
  } catch {
    return "GONE";
  }
}

export async function deletePod(podName: string): Promise<void> {
  await coreApi.deleteNamespacedPod({ name: podName, namespace: config.KUBE_NAMESPACE });
}

/** Walk ownerReferences: Pod -> ReplicaSet -> Deployment. */
export async function resolveOwningDeployment(podName: string): Promise<string | null> {
  const pod = await coreApi.readNamespacedPod({
    name: podName,
    namespace: config.KUBE_NAMESPACE,
  });
  const rsRef = pod.metadata?.ownerReferences?.find((r) => r.kind === "ReplicaSet");
  if (!rsRef) return null;
  const rs = await appsApi.readNamespacedReplicaSet({
    name: rsRef.name,
    namespace: config.KUBE_NAMESPACE,
  });
  return rs.metadata?.ownerReferences?.find((r) => r.kind === "Deployment")?.name ?? null;
}

/**
 * Scale via read-then-replace on the scale subresource. Deliberately not a
 * patch: patch requires per-call content-type middleware in client v2, and this
 * path must be dependable when a human has just approved it live.
 */
export async function scaleDeployment(
  deploymentName: string,
  replicas: number,
): Promise<{ previousReplicas: number; newReplicas: number }> {
  const namespace = config.KUBE_NAMESPACE;
  const scale = await appsApi.readNamespacedDeploymentScale({ name: deploymentName, namespace });
  const previousReplicas = scale.spec?.replicas ?? 0;
  scale.spec = { ...scale.spec, replicas };
  await appsApi.replaceNamespacedDeploymentScale({ name: deploymentName, namespace, body: scale });
  return { previousReplicas, newReplicas: replicas };
}

export function currentContext(): string {
  return kc.getCurrentContext();
}
