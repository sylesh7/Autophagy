#!/usr/bin/env bash
# Deploy EfficiencyRegistry to Base Sepolia with Hardhat Ignition.
#
# Prerequisites:
#   1. backend/.env contains BACKEND_SIGNER_PRIVATE_KEY (0x-prefixed, 32 bytes)
#   2. That address holds Base Sepolia ETH:
#      https://www.coinbase.com/faucets/base-sepolia-faucet
#
# The deploying account becomes both owner and first authorised attestor, so
# deploying with the backend's own signer means it can attest immediately.
#
# Ignition prompts for confirmation before writing to a live network, and
# records the deployment under ignition/deployments/chain-84532 so re-running
# reuses the existing deployment instead of redeploying. Use --reset to force
# a fresh one.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$HERE"

if [ -f "$ROOT/.env" ]; then
  set -a; . "$ROOT/.env"; set +a
else
  echo "backend/.env not found. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

: "${BACKEND_SIGNER_PRIVATE_KEY:?BACKEND_SIGNER_PRIVATE_KEY is not set in backend/.env}"
export BASE_SEPOLIA_RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
# Referenced by the verify config; harmless when empty since verification is opt-in.
export BASESCAN_API_KEY="${BASESCAN_API_KEY:-}"

echo "==> Checking deployer account"
node --input-type=module -e '
import { JsonRpcProvider, Wallet, formatEther } from "ethers";
const provider = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
const wallet = new Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY, provider);
const network = await provider.getNetwork();
if (Number(network.chainId) !== 84532) {
  console.error(`RPC reports chain ${network.chainId}, expected 84532 (Base Sepolia)`);
  process.exit(1);
}
const balance = await provider.getBalance(wallet.address);
console.log(`    address: ${wallet.address}`);
console.log(`    balance: ${formatEther(balance)} ETH`);
if (balance === 0n) {
  console.error("\nDeployer has no ETH. Fund it at:");
  console.error("  https://www.coinbase.com/faucets/base-sepolia-faucet");
  process.exit(1);
}
'

echo
echo "==> Deploying EfficiencyRegistry to Base Sepolia (chain 84532)"
npx hardhat ignition deploy ignition/modules/EfficiencyRegistry.ts \
  --network baseSepolia \
  --build-profile production

echo
echo "Deployment recorded in contracts/ignition/deployments/chain-84532/"
echo "Copy the deployed address into backend/.env as EFFICIENCY_REGISTRY_ADDRESS,"
echo "then verify it on https://sepolia.basescan.org"
