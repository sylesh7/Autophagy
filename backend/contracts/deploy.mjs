#!/usr/bin/env node
/**
 * Deploy EfficiencyRegistry to Base Sepolia via Hardhat Ignition.
 *
 * Hardhat's configVariable() resolves from process.env, so this loads
 * backend/.env first and then hands off to Ignition. Node rather than shell for
 * the same reason as k8s/setup.mjs: `bash` resolves to WSL on Windows, which
 * would not see the same environment or the same Hardhat install.
 *
 * Prerequisites:
 *   1. backend/.env has BACKEND_SIGNER_PRIVATE_KEY (0x-prefixed, 32 bytes)
 *   2. That address holds Base Sepolia ETH:
 *      https://www.coinbase.com/faucets/base-sepolia-faucet
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(HERE, "..", ".env");

if (!existsSync(ENV_FILE)) {
  console.error(`ERROR: ${ENV_FILE} not found.`);
  console.error("  Copy .env.example to .env and fill it in first.");
  process.exit(1);
}

/** Minimal .env reader — avoids a dependency in the contracts package. */
for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = value;
}

// Accept the key with or without the 0x prefix, then normalise — ethers and
// Hardhat both require the prefix, and wallet exports vary on including it.
let key = process.env.BACKEND_SIGNER_PRIVATE_KEY;
if (key && !key.startsWith("0x")) {
  key = `0x${key}`;
  process.env.BACKEND_SIGNER_PRIVATE_KEY = key;
}
if (!key || !/^0x[a-fA-F0-9]{64}$/.test(key)) {
  console.error("ERROR: BACKEND_SIGNER_PRIVATE_KEY in backend/.env is missing or malformed.");
  console.error("  It must be 64 hex characters (the 0x prefix is optional).");
  console.error("  Generate one: node -e \"console.log(require('ethers').Wallet.createRandom().privateKey)\"");
  process.exit(1);
}

process.env.BASE_SEPOLIA_RPC_URL ||= "https://sepolia.base.org";
// Hardhat prompts for any configVariable it cannot resolve; verification is
// optional, so give it a value rather than let it block a deploy.
process.env.BASESCAN_API_KEY ||= "";

console.log("Deploying EfficiencyRegistry to Base Sepolia (chain 84532)");
console.log(`RPC: ${process.env.BASE_SEPOLIA_RPC_URL}\n`);

// Invoke Hardhat's JS entrypoint with the current Node binary rather than the
// .bin shim. Spawning the .cmd shim on Windows would require shell: true, which
// concatenates arguments instead of escaping them.
const hardhatCli = join(HERE, "node_modules", "hardhat", "dist", "src", "cli.js");

const result = spawnSync(
  process.execPath,
  [
    hardhatCli,
    "ignition",
    "deploy",
    "ignition/modules/EfficiencyRegistry.ts",
    "--network",
    "baseSepolia",
  ],
  { cwd: HERE, stdio: "inherit", env: process.env },
);

if (result.status !== 0) process.exit(result.status ?? 1);

console.log(`
Copy the deployed address into backend/.env as EFFICIENCY_REGISTRY_ADDRESS,
then verify it on https://sepolia.basescan.org
`);
