import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the EfficiencyRegistry.
 *
 * The constructor makes the deploying account both owner and the first
 * authorised attestor, so when this is deployed with BACKEND_SIGNER_PRIVATE_KEY
 * the backend can attest immediately with no follow-up transaction.
 *
 * If you deploy from a different key than the backend signs with, grant the
 * backend afterwards:
 *   registry.setAttestor(backendAddress, true)
 *
 * Ignition records the deployment under ignition/deployments/chain-84532, so
 * re-running this will reuse the existing deployment rather than redeploy.
 */
export default buildModule("EfficiencyRegistryModule", (m) => {
  const registry = m.contract("EfficiencyRegistry");

  return { registry };
});
