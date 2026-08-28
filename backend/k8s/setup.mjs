#!/usr/bin/env node
/**
 * Bring up the real cluster Autophagy observes.
 *
 * Autophagy reads live pod specs and live metrics-server samples. There is no
 * simulation mode, so this has to be a genuine cluster before the backend will
 * start.
 *
 * Two supported backends, selected by KUBE_CONTEXT:
 *   docker-desktop  — Kubernetes built into Docker Desktop. No large image pull,
 *                     since Docker Desktop ships its control-plane images.
 *   minikube        — a dedicated minikube profile, created here if absent.
 *
 * Written in Node rather than shell on purpose. On Windows, `npm run` resolves
 * `bash` to WSL's bash, which has a different filesystem layout (/mnt/c, not
 * /c) and — more importantly — its own ~/.kube/config. A cluster created from
 * inside WSL would be invisible to the backend, which runs on Windows Node and
 * reads the Windows kubeconfig. Driving everything from Node keeps the setup
 * and the backend pointed at exactly one cluster and one kubeconfig.
 */
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAMESPACE = process.env.KUBE_NAMESPACE || "autophagy";
const CONTEXT = process.env.KUBE_CONTEXT || "docker-desktop";
const PROFILE = process.env.MINIKUBE_PROFILE || "minikube";
const USE_MINIKUBE = CONTEXT === "minikube";
const isWindows = process.platform === "win32";

const METRICS_SERVER_URL =
  "https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml";

/**
 * Directories to search when a tool is installed but not visible on PATH.
 * On Windows this is the common case rather than an edge case: winget updates
 * the machine PATH, but shells opened before the install keep the old one.
 */
const EXTRA_DIRS = isWindows
  ? [
      "C:\\Program Files\\Kubernetes\\Minikube",
      "C:\\Program Files\\Docker\\Docker\\resources\\bin",
      join(process.env.LOCALAPPDATA || "", "Microsoft\\WinGet\\Links"),
      join(process.env.USERPROFILE || "", "scoop\\shims"),
      "C:\\ProgramData\\chocolatey\\bin",
    ].filter(Boolean)
  : ["/usr/local/bin", "/opt/homebrew/bin", join(process.env.HOME || "", ".local/bin")];

const EXE_SUFFIXES = isWindows ? [".exe", ".cmd", ".bat", ""] : [""];

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Find a tool on PATH, then in the known install locations. */
function resolveTool(name, hint) {
  const pathDirs = (process.env.PATH || "").split(isWindows ? ";" : ":").filter(Boolean);

  for (const dir of [...pathDirs, ...EXTRA_DIRS]) {
    for (const suffix of EXE_SUFFIXES) {
      const candidate = join(dir, name + suffix);
      if (isExecutable(candidate)) {
        if (!pathDirs.includes(dir)) {
          console.log(`    found ${name} in ${dir} (not on PATH — using it anyway)`);
        }
        return candidate;
      }
    }
  }

  console.error(`\nERROR: '${name}' is not installed or could not be found.`);
  console.error(`  ${hint}`);
  console.error(`  Searched PATH plus: ${EXTRA_DIRS.join(", ")}`);
  process.exit(1);
}

function run(exe, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(exe, args, {
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    shell: false,
  });

  if (result.error) {
    if (allowFailure) return { ok: false, stdout: "", stderr: String(result.error) };
    console.error(`\nERROR running ${exe} ${args.join(" ")}: ${result.error.message}`);
    process.exit(1);
  }

  const ok = result.status === 0;
  if (!ok && !allowFailure) {
    console.error(`\nERROR: ${exe} ${args.join(" ")} exited with code ${result.status}`);
    if (capture && result.stderr) console.error(result.stderr);
    process.exit(1);
  }

  return { ok, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ---------------------------------------------------------------------------

console.log(`==> Locating tools (target context: ${CONTEXT})`);
const kubectl = resolveTool("kubectl", "Install: https://kubernetes.io/docs/tasks/tools/");
const docker = resolveTool(
  "docker",
  "Install Docker Desktop: https://www.docker.com/products/docker-desktop/",
);
const minikube = USE_MINIKUBE
  ? resolveTool("minikube", "Install: https://minikube.sigs.k8s.io/docs/start/")
  : null;
console.log(`    kubectl: ${kubectl}`);

console.log("\n==> Checking the Docker daemon");
const dockerInfo = run(docker, ["info", "--format", "{{.ServerVersion}}"], {
  capture: true,
  allowFailure: true,
});
if (!dockerInfo.ok) {
  console.error("\nERROR: the Docker daemon is not responding.");
  console.error("  Start Docker Desktop, wait for the whale icon to stop animating, then retry.");
  process.exit(1);
}
console.log(`    Docker engine ${dockerInfo.stdout.trim()} is up`);

// --- Ensure the cluster exists ---------------------------------------------

if (USE_MINIKUBE) {
  console.log(`\n==> Starting minikube profile '${PROFILE}'`);
  const status = run(minikube, ["status", "-p", PROFILE], { capture: true, allowFailure: true });
  if (status.ok) {
    console.log("    already running");
  } else {
    run(minikube, ["start", "-p", PROFILE, "--cpus=2", "--memory=4096", "--driver=docker"]);
  }
  run(minikube, ["update-context", "-p", PROFILE], { allowFailure: true });
} else {
  console.log(`\n==> Checking for the '${CONTEXT}' context`);
  const contexts = run(kubectl, ["config", "get-contexts", "-o", "name"], {
    capture: true,
    allowFailure: true,
  });
  if (!contexts.stdout.split("\n").map((s) => s.trim()).includes(CONTEXT)) {
    console.error(`\nERROR: kube context '${CONTEXT}' does not exist yet.`);
    console.error("  Enable it in Docker Desktop:");
    console.error("    Settings > Kubernetes > check 'Enable Kubernetes' > Apply & Restart");
    console.error("  It takes a few minutes to come up the first time.");
    console.error(
      `  Available contexts: ${contexts.stdout.trim().split("\n").filter(Boolean).join(", ") || "(none)"}`,
    );
    process.exit(1);
  }
  run(kubectl, ["config", "use-context", CONTEXT]);
  console.log(`    using context '${CONTEXT}'`);
}

console.log("\n==> Verifying the cluster answers");
const nodes = run(kubectl, ["get", "nodes", "--no-headers"], { capture: true, allowFailure: true });
if (!nodes.ok) {
  console.error("\nERROR: the cluster is not responding yet.");
  console.error("  If you just enabled Kubernetes, give it a few minutes and retry.");
  console.error(nodes.stderr.trim());
  process.exit(1);
}
console.log(`    ${nodes.stdout.trim().split("\n").length} node(s) ready`);

// --- metrics-server ---------------------------------------------------------

/**
 * The Watcher measures real usage, so metrics-server is not optional.
 *
 * Docker Desktop does not ship it, and on a kubelet whose serving certs are not
 * signed by the cluster CA, metrics-server fails its TLS check and reports
 * nothing. --kubelet-insecure-tls is the standard fix for local single-node
 * clusters. minikube's addon already handles both.
 */
console.log("\n==> Ensuring metrics-server is installed");
const existing = run(kubectl, ["get", "deployment", "metrics-server", "-n", "kube-system"], {
  capture: true,
  allowFailure: true,
});

if (USE_MINIKUBE) {
  run(minikube, ["addons", "enable", "metrics-server", "-p", PROFILE]);
} else if (existing.ok) {
  console.log("    already present");
} else {
  console.log(`    applying ${METRICS_SERVER_URL}`);
  run(kubectl, ["apply", "-f", METRICS_SERVER_URL]);
}

if (!USE_MINIKUBE) {
  const args = run(
    kubectl,
    [
      "get",
      "deployment",
      "metrics-server",
      "-n",
      "kube-system",
      "-o",
      "jsonpath={.spec.template.spec.containers[0].args}",
    ],
    { capture: true, allowFailure: true },
  );

  // Idempotent: only append the flag when it is not already there.
  if (args.ok && !args.stdout.includes("--kubelet-insecure-tls")) {
    console.log("    patching with --kubelet-insecure-tls (self-signed kubelet certs)");
    run(kubectl, [
      "patch",
      "deployment",
      "metrics-server",
      "-n",
      "kube-system",
      "--type=json",
      "-p",
      '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]',
    ]);
  }
}

/**
 * Pre-pull images on the host, then hand them to the node's containerd.
 *
 * Docker Desktop routes in-cluster pulls through a pull-through cache, and
 * containerd applies a deadline to the whole pull. On a slow connection the
 * cache is still fetching upstream when that deadline expires, so the pod sits
 * in ImagePullBackOff forever even though the network is fine — it is just slow.
 *
 * `docker pull` on the host has no such deadline, so pulling there and
 * importing sidesteps the problem entirely. Both steps are safe to repeat: an
 * already-present image is a no-op.
 */
function preloadImages(images) {
  if (USE_MINIKUBE) {
    for (const image of images) {
      run(minikube, ["image", "load", image, "-p", PROFILE], { allowFailure: true });
    }
    return;
  }

  const node = "desktop-control-plane";
  const nodeExists = run(docker, ["inspect", node, "--format", "{{.State.Status}}"], {
    capture: true,
    allowFailure: true,
  });
  if (!nodeExists.ok) {
    console.log("    (node container not found — letting Kubernetes pull directly)");
    return;
  }

  for (const image of images) {
    const present = run(docker, ["image", "inspect", image], {
      capture: true,
      allowFailure: true,
    });
    if (!present.ok) {
      console.log(`    pulling ${image} on the host`);
      run(docker, ["pull", image]);
    } else {
      console.log(`    ${image} already on the host`);
    }
  }

  // `docker cp` silently no-ops against Docker Desktop's hidden node container,
  // so stream the archive over stdin instead.
  console.log("    importing into the node's containerd");
  const save = spawnSync(docker, ["save", ...images], {
    maxBuffer: 1024 * 1024 * 1024,
    encoding: "buffer",
  });
  if (save.status !== 0) {
    console.log("    (could not export images — letting Kubernetes pull directly)");
    return;
  }

  const load = spawnSync(
    docker,
    ["exec", "-i", node, "ctr", "-n", "k8s.io", "images", "import", "-"],
    { input: save.stdout, maxBuffer: 1024 * 1024 * 1024 },
  );
  if (load.status !== 0) {
    console.log("    (import failed — letting Kubernetes pull directly)");
  }
}

console.log("\n==> Preloading images (avoids in-cluster pull timeouts)");
preloadImages(["registry.k8s.io/metrics-server/metrics-server:v0.9.0", "busybox:1.36"]);

console.log("\n==> Waiting for metrics-server to become available");
const available = run(
  kubectl,
  [
    "wait",
    "--for=condition=Available",
    "deployment/metrics-server",
    "-n",
    "kube-system",
    "--timeout=240s",
  ],
  { allowFailure: true },
);

// A pod stuck on an image it cannot pull will not recover on its own once the
// image is finally present locally — it has to be restarted to retry.
if (!available.ok) {
  console.log("    not ready yet — restarting its pods to retry with local images");
  run(kubectl, ["delete", "pods", "-n", "kube-system", "-l", "k8s-app=metrics-server"], {
    allowFailure: true,
  });
  run(kubectl, [
    "wait",
    "--for=condition=Available",
    "deployment/metrics-server",
    "-n",
    "kube-system",
    "--timeout=240s",
  ]);
}

// --- Workloads --------------------------------------------------------------

console.log("\n==> Creating namespace and demo agent workloads");
run(kubectl, ["apply", "-f", resolve(HERE, "namespace.yaml")]);

const workloadDir = resolve(HERE, "workloads");
for (const file of readdirSync(workloadDir).sort()) {
  if (file.endsWith(".yaml")) run(kubectl, ["apply", "-f", join(workloadDir, file)]);
}

console.log("\n==> Waiting for agent pods to start");
run(
  kubectl,
  [
    "wait",
    "--for=condition=Ready",
    "pod",
    "-l",
    "autophagy.io/role=agent",
    "-n",
    NAMESPACE,
    "--timeout=240s",
  ],
  { allowFailure: true },
);

// metrics-server needs a couple of scrape intervals before it reports anything.
// The Watcher will not invent numbers, so the cluster is not really ready until
// this returns data.
console.log("\n==> Waiting for the first real metrics samples (up to 2 min)");
let metricsReady = false;
for (let attempt = 0; attempt < 24; attempt++) {
  const top = run(kubectl, ["top", "pods", "-n", NAMESPACE], {
    capture: true,
    allowFailure: true,
  });
  if (top.ok && top.stdout.trim()) {
    metricsReady = true;
    break;
  }
  process.stdout.write(".");
  sleep(5000);
}
console.log("");

console.log("");
run(kubectl, ["get", "pods", "-n", NAMESPACE, "-o", "wide"]);
console.log("");

if (metricsReady) {
  run(kubectl, ["top", "pods", "-n", NAMESPACE]);
} else {
  console.log(`(metrics not ready yet — retry in a minute: kubectl top pods -n ${NAMESPACE})`);
}

/**
 * Report only what is actually still outstanding.
 *
 * Printing a fixed checklist every run is worse than useless once the setup is
 * complete — it tells you to redo work that is already done, and cannot mention
 * the provider you actually configured.
 */
function readEnvFile() {
  const path = resolve(HERE, "..", ".env");
  if (!existsSync(path)) return null;
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

console.log(`\nCluster is up on context '${CONTEXT}'.`);

const env = readEnvFile();
const todo = [];

if (!env) {
  todo.push("cp .env.example .env, then fill it in");
} else {
  if (env.KUBE_CONTEXT !== CONTEXT) {
    todo.push(`set KUBE_CONTEXT=${CONTEXT} in .env (currently "${env.KUBE_CONTEXT ?? "unset"}")`);
  }

  const provider = env.LLM_PROVIDER || "groq";
  const keyVar = { groq: "GROQ_API_KEY", xai: "XAI_API_KEY", openrouter: "OPENROUTER_API_KEY" }[
    provider
  ];
  if (keyVar && !env[keyVar]) {
    todo.push(`set ${keyVar} in .env (LLM_PROVIDER=${provider})`);
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test((env.BACKEND_SIGNER_PRIVATE_KEY ?? "").replace(/^(?!0x)/, "0x"))) {
    todo.push("set BACKEND_SIGNER_PRIVATE_KEY in .env, funded from the Base Sepolia faucet");
  }

  const registry = env.EFFICIENCY_REGISTRY_ADDRESS ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(registry) || /^0x0+$/.test(registry)) {
    todo.push("npm run contracts:deploy   # writes EFFICIENCY_REGISTRY_ADDRESS");
  }
}

if (todo.length === 0) {
  console.log("Configuration looks complete. Start the backend with:\n  npm run dev\n");
} else {
  console.log("\nStill to do:");
  todo.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  console.log("\nThen: npm run dev\n");
}
