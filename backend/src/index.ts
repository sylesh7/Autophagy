import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config, llm } from "./config.js";
import { logger } from "./logger.js";
import { assertClusterReachable, currentContext } from "./k8s/client.js";
import { assertChainReady, signerAddress } from "./chain/registry.js";
import { api } from "./routes/api.js";
import { startWatcher, stopWatcher } from "./watcher/watcher.js";

const log = logger("server");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api", api);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error(err.message, err.stack);
  res.status(500).json({ error: err.message });
});

/**
 * Autophagy proves each real dependency before it starts claiming anything on a
 * dashboard. A backend that boots cleanly and then silently reports nothing —
 * because metrics-server is down, or the contract address is wrong — is worse
 * than one that refuses to start and says which piece is missing.
 */
async function main(): Promise<void> {
  log.info("verifying real dependencies before serving...");

  const cluster = await assertClusterReachable();
  log.info(
    `cluster ok: context "${currentContext()}", Kubernetes ${cluster.serverVersion}, ` +
      `${cluster.nodeCount} node(s)`,
  );

  if (!cluster.metricsServerReady) {
    throw new Error(
      "metrics-server is not serving metrics. The Watcher measures real usage and will " +
        "not substitute estimates. Enable it with: minikube addons enable metrics-server",
    );
  }
  log.info("metrics-server ok: live usage available");

  const chain = await assertChainReady();
  log.info(
    `chain ok: Base Sepolia (${chain.chainId}), registry ${chain.registryAddress}, ` +
      `attestor ${chain.signer} holding ${chain.balanceEth} ETH, ` +
      `${chain.totalAgents} agent(s) registered`,
  );

  log.info(`diagnostician: ${llm.model} via ${llm.label} (${llm.baseUrl})`);

  const server = app.listen(config.PORT, () => {
    log.info(`listening on http://localhost:${config.PORT}`);
    log.info(`attestations signed by ${signerAddress()}`);
    startWatcher();
  });

  const shutdown = (signal: string): void => {
    log.info(`${signal} received, shutting down`);
    stopWatcher();
    server.close(() => process.exit(0));
    // Do not hang forever on lingering SSE connections.
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  log.error(
    "startup failed",
    err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err),
  );
  process.exit(1);
});
