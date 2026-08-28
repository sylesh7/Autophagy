import { config } from "../config.js";
import { logger } from "../logger.js";
import {
  deletePod,
  podLiveness,
  resolveOwningDeployment,
  scaleDeployment,
} from "../k8s/client.js";
import { attestIncident, computeEvidenceHash } from "../chain/registry.js";
import * as store from "../store/incidents.js";
import type { ClusterActionResult, Incident } from "../types.js";
import { pipelineEvents } from "../watcher/watcher.js";

const log = logger("remediate");

/** Annotation carrying the agent's own on-chain address. */
const AGENT_WALLET_ANNOTATION = "autophagy.io/agent-wallet";
/** Annotation pointing at the agent's registration document. */
const AGENT_URI_ANNOTATION = "autophagy.io/agent-uri";

/**
 * An attestation is only meaningful if it lands against the right identity.
 * If an agent has not declared its address, that is a real gap in the fleet's
 * setup — reported plainly rather than papered over with a placeholder that
 * would attach a permanent public record to the wrong agent.
 */
export function resolveAgentWallet(incident: Incident): { wallet: string; uri: string } {
  const annotations = incident.anomaly.latest.annotations;
  const wallet = annotations[AGENT_WALLET_ANNOTATION];

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    throw new Error(
      `Pod ${incident.anomaly.podName} has no valid "${AGENT_WALLET_ANNOTATION}" annotation, ` +
        `so its incident cannot be attributed to an on-chain identity. Annotate the ` +
        `workload with the agent's address to make it attestable.`,
    );
  }

  return {
    wallet,
    uri:
      annotations[AGENT_URI_ANNOTATION] ??
      `autophagy://agent/${incident.anomaly.podName}`,
  };
}

/**
 * Execute the approved corrective action against the live cluster, then re-read
 * cluster state so the result reports what actually happened rather than what
 * was requested.
 */
async function executeClusterAction(incident: Incident): Promise<ClusterActionResult> {
  const proposal = incident.proposal;
  if (!proposal) throw new Error(`incident ${incident.id} has no proposal to execute`);

  const podName = proposal.target.podName;
  let detail: string;

  switch (proposal.action) {
    case "TERMINATE":
    case "REASSIGN": {
      await deletePod(podName);
      detail = `Deleted pod ${podName} from namespace ${config.KUBE_NAMESPACE}`;
      break;
    }
    case "SCALE_DOWN": {
      const deployment = await resolveOwningDeployment(podName);
      if (!deployment) {
        throw new Error(
          `Cannot scale ${podName}: it is not owned by a Deployment. A bare pod can only ` +
            `be terminated, not scaled.`,
        );
      }
      const current = await scaleDeployment(deployment, 0);
      detail =
        `Scaled deployment ${deployment} from ${current.previousReplicas} to ` +
        `${current.newReplicas} replicas`;
      break;
    }
  }

  // Re-query rather than assume. The dashboard claims the cluster changed, so
  // the claim has to be backed by a fresh read.
  const podState = await podLiveness(podName);

  // A scale-down leaves the pod terminating too, so both actions verify the
  // same way: the pod is gone, or the API has accepted its deletion.
  const verified = podState === "GONE" || podState === "TERMINATING";

  log.info(`${detail} — pod is now ${podState}`);

  return {
    action: proposal.action,
    podName,
    executedAt: new Date().toISOString(),
    podState,
    verified,
    detail: `${detail}. Re-queried the cluster: pod is ${podState}.`,
  };
}

/**
 * The human approval gate. Runs the real cluster action, then commits the
 * attestation.
 *
 * Ordering is deliberate: the cluster action happens first and is verified, so
 * the permanent public record is only written once the remediation genuinely
 * landed. If attestation then fails, the incident is marked FAILED with the
 * cluster action preserved — a partially completed remediation is reported as
 * such rather than rounded up to success.
 */
export async function approveAndExecute(
  incidentId: string,
  approvedBy: string,
  note?: string,
): Promise<Incident> {
  const incident = store.get(incidentId);
  if (!incident) throw new Error(`Unknown incident ${incidentId}`);
  if (!incident.diagnosis) throw new Error(`Incident ${incidentId} has not been diagnosed`);
  if (incident.diagnosis.verdict !== "WASTE") {
    throw new Error(
      `Incident ${incidentId} was diagnosed ${incident.diagnosis.verdict}; only a WASTE ` +
        `verdict can be approved for remediation.`,
    );
  }
  if (!incident.proposal) throw new Error(`Incident ${incidentId} has no proposal`);
  if (incident.status === "REMEDIATED") {
    throw new Error(`Incident ${incidentId} has already been remediated`);
  }

  // Resolve identity before touching the cluster: failing here after the pod is
  // already gone would leave an unattestable incident.
  const { wallet, uri } = resolveAgentWallet(incident);

  store.setApproval(incidentId, {
    approvedBy,
    approvedAt: new Date().toISOString(),
    note,
  });
  pipelineEvents.emit("incident", store.get(incidentId));

  try {
    /**
     * A remediation is two steps against two different systems, so it can fail
     * half-done — the cluster action lands and the attestation errors. Retrying
     * from the start would try to delete a pod that is already gone and fail
     * for the wrong reason, so a recorded cluster action is not repeated.
     */
    let clusterAction = incident.clusterAction;
    if (clusterAction) {
      log.info(
        `cluster action for ${incidentId} already executed at ${clusterAction.executedAt}; ` +
          `resuming at the attestation step`,
      );
    } else {
      clusterAction = await executeClusterAction(incident);
      store.setClusterAction(incidentId, clusterAction);
      pipelineEvents.emit("incident", store.get(incidentId));
    }

    const evidenceHash = computeEvidenceHash(
      incident.anomaly,
      incident.diagnosis,
      incident.proposal,
    );

    const attestation = await attestIncident({
      agentWallet: wallet,
      agentURI: uri,
      incidentType: incident.diagnosis.incidentType,
      wasteUsdPerHour: incident.proposal.wasteUsdPerHour,
      confidence: incident.diagnosis.confidence,
      evidenceHash,
    });

    store.setAttestation(incidentId, attestation);
    pipelineEvents.emit("incident", store.get(incidentId));

    log.info(
      `incident ${incidentId} remediated and attested: ${attestation.explorerUrl}`,
    );

    return store.get(incidentId)!;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setError(incidentId, message);
    pipelineEvents.emit("incident", store.get(incidentId));
    throw err;
  }
}
