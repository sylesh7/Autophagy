import {
  Contract,
  JsonRpcProvider,
  Wallet,
  keccak256,
  toUtf8Bytes,
  type ContractTransactionResponse,
} from "ethers";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { Anomaly, ChainAttestation, Diagnosis, Proposal } from "../types.js";

const log = logger("chain");

/**
 * Human-readable ABI, kept in sync with contracts/src/EfficiencyRegistry.sol.
 * Inlined deliberately so the running backend does not depend on forge build
 * artifacts being present on disk.
 */
export const EFFICIENCY_REGISTRY_ABI = [
  "function registerAgent(address agentWallet, string agentURI) returns (uint256)",
  "function attestIncident(uint256 agentId, string incidentType, uint256 costImpactMicroUsd, uint8 confidence, bytes32 evidenceHash)",
  "function getHistory(uint256 agentId) view returns (tuple(string incidentType, uint256 costImpactMicroUsd, uint8 confidence, bytes32 evidenceHash, uint64 timestamp, address attestedBy)[])",
  "function getAgent(uint256 agentId) view returns (tuple(uint256 agentId, address owner, address agentWallet, string agentURI, uint64 registeredAt, uint64 incidentCount, uint256 totalCostImpactMicroUsd, bool exists))",
  "function getSummary(uint256 agentId) view returns (uint64 incidentCount, uint256 totalCostImpactMicroUsd, uint64 lastIncidentAt)",
  "function resolveAgentId(address agentWallet) view returns (uint256)",
  "function totalAgents() view returns (uint256)",
  "function isAttestor(address) view returns (bool)",
  "function owner() view returns (address)",
  "event AgentRegistered(uint256 indexed agentId, address indexed agentWallet, address indexed owner, string agentURI, uint64 timestamp)",
  "event IncidentAttested(uint256 indexed agentId, string indexed indexedIncidentType, string incidentType, uint256 costImpactMicroUsd, uint8 confidence, bytes32 evidenceHash, uint64 timestamp, address indexed attestedBy)",
] as const;

/** On-chain agent record, matching the contract's Agent struct. */
export interface OnChainAgent {
  agentId: bigint;
  owner: string;
  agentWallet: string;
  agentURI: string;
  registeredAt: bigint;
  incidentCount: bigint;
  totalCostImpactMicroUsd: bigint;
  exists: boolean;
}

/** Raw tuple ordering of the contract's Incident struct, as ethers decodes it. */
export type OnChainIncidentTuple = [
  incidentType: string,
  costImpactMicroUsd: bigint,
  confidence: bigint,
  evidenceHash: string,
  timestamp: bigint,
  attestedBy: string,
];

/**
 * ethers builds contract methods dynamically, so they are untyped at compile
 * time. Declaring the surface Autophagy actually uses keeps the call sites
 * type-checked against the real ABI above rather than silently accepting
 * whatever is passed.
 */
interface EfficiencyRegistryContract {
  registerAgent(agentWallet: string, agentURI: string): Promise<ContractTransactionResponse>;
  attestIncident(
    agentId: bigint,
    incidentType: string,
    costImpactMicroUsd: bigint,
    confidence: number,
    evidenceHash: string,
  ): Promise<ContractTransactionResponse>;
  getHistory(agentId: bigint): Promise<OnChainIncidentTuple[]>;
  getAgent(agentId: bigint): Promise<OnChainAgent>;
  getSummary(agentId: bigint): Promise<[bigint, bigint, bigint]>;
  resolveAgentId(agentWallet: string): Promise<bigint>;
  totalAgents(): Promise<bigint>;
  isAttestor(address: string): Promise<boolean>;
  owner(): Promise<string>;
}

const provider = new JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL, {
  chainId: config.BASE_SEPOLIA_CHAIN_ID,
  name: "base-sepolia",
});

const signer = new Wallet(config.BACKEND_SIGNER_PRIVATE_KEY, provider);

export const registry = new Contract(
  config.EFFICIENCY_REGISTRY_ADDRESS,
  EFFICIENCY_REGISTRY_ABI,
  signer,
) as unknown as Contract & EfficiencyRegistryContract;

export function signerAddress(): string {
  return signer.address;
}

export function explorerTxUrl(txHash: string): string {
  return `${config.BLOCK_EXPLORER_URL}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${config.BLOCK_EXPLORER_URL}/address/${address}`;
}

/**
 * Boot-time proof that the chain half is genuinely wired: right network, a
 * contract actually deployed at the configured address, and a signer that is
 * both funded and authorised to attest. Each of these fails silently at the
 * worst possible moment (mid-demo, post-approval) if not checked up front.
 */
export async function assertChainReady(): Promise<{
  chainId: number;
  signer: string;
  balanceEth: string;
  registryAddress: string;
  isAttestor: boolean;
  totalAgents: string;
}> {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== config.BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `RPC ${config.BASE_SEPOLIA_RPC_URL} reports chain ${network.chainId}, ` +
        `expected ${config.BASE_SEPOLIA_CHAIN_ID} (Base Sepolia)`,
    );
  }

  const code = await provider.getCode(config.EFFICIENCY_REGISTRY_ADDRESS);
  if (code === "0x") {
    throw new Error(
      `No contract deployed at ${config.EFFICIENCY_REGISTRY_ADDRESS} on chain ` +
        `${network.chainId}. Deploy it with: npm run contracts:deploy`,
    );
  }

  const balance = await provider.getBalance(signer.address);
  if (balance === 0n) {
    throw new Error(
      `Backend signer ${signer.address} has no Base Sepolia ETH and cannot submit ` +
        `attestations. Fund it: https://www.coinbase.com/faucets/base-sepolia-faucet`,
    );
  }

  const isAttestor = await registry.isAttestor(signer.address);
  if (!isAttestor) {
    throw new Error(
      `Backend signer ${signer.address} is not an authorised attestor on ` +
        `${config.EFFICIENCY_REGISTRY_ADDRESS}. The contract owner must call ` +
        `setAttestor("${signer.address}", true).`,
    );
  }

  const totalAgents = await registry.totalAgents();

  return {
    chainId: Number(network.chainId),
    signer: signer.address,
    balanceEth: (Number(balance) / 1e18).toFixed(6),
    registryAddress: config.EFFICIENCY_REGISTRY_ADDRESS,
    isAttestor,
    totalAgents: totalAgents.toString(),
  };
}

/**
 * The evidence commitment. Hashing the canonical evidence bundle means the
 * on-chain record can be checked against what Autophagy actually observed —
 * an attestation is not just an assertion, it is bound to its evidence.
 */
export function computeEvidenceHash(
  anomaly: Anomaly,
  diagnosis: Diagnosis,
  proposal: Proposal,
): string {
  const bundle = {
    pod: anomaly.podName,
    podUid: anomaly.podUid,
    incidentType: diagnosis.incidentType,
    evidence: anomaly.evidence,
    mitigations: anomaly.mitigations,
    sustainedWindows: anomaly.sustainedWindows,
    cpuUtilisationSeries: anomaly.cpuUtilisationSeries,
    verdict: diagnosis.verdict,
    confidence: diagnosis.confidence,
    reasoning: diagnosis.reasoning,
    model: diagnosis.model,
    wasteUsdPerHour: proposal.wasteUsdPerHour,
    action: proposal.action,
  };
  return keccak256(toUtf8Bytes(JSON.stringify(bundle)));
}

/** Resolve an agent's on-chain id, registering the identity if it has none. */
export async function ensureAgentRegistered(
  agentWallet: string,
  agentURI: string,
): Promise<bigint> {
  const existing = await registry.resolveAgentId(agentWallet);
  if (existing !== 0n) return existing;

  log.info(`registering new agent identity for ${agentWallet}`);
  const tx = await registry.registerAgent(agentWallet, agentURI);
  const receipt = await tx.wait();

  if (!receipt) throw new Error(`registerAgent tx ${tx.hash} produced no receipt`);
  if (receipt.status !== 1) throw new Error(`registerAgent tx ${tx.hash} reverted`);
  log.info(`agent registered in block ${receipt.blockNumber} (tx ${tx.hash})`);

  /**
   * Take the id from the receipt's own event rather than a follow-up read.
   *
   * Public RPC endpoints are load-balanced across nodes, so a read issued
   * immediately after a confirmed write can land on one that has not applied
   * the block yet and answer 0 — which previously failed the attestation even
   * though the registration had succeeded. The receipt is authoritative and
   * needs no second round trip.
   */
  for (const entry of receipt.logs) {
    let parsed;
    try {
      parsed = registry.interface.parseLog({ topics: [...entry.topics], data: entry.data });
    } catch {
      continue; // not one of ours
    }
    if (parsed?.name === "AgentRegistered") {
      return parsed.args.agentId as bigint;
    }
  }

  // No event found — fall back to reading, tolerating a node that lags behind.
  for (let attempt = 0; attempt < 5; attempt++) {
    const agentId = await registry.resolveAgentId(agentWallet);
    if (agentId !== 0n) return agentId;
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error(
    `registerAgent for ${agentWallet} was mined in block ${receipt.blockNumber} but no ` +
      `agent id could be resolved. Check ${explorerTxUrl(tx.hash)}`,
  );
}

/** Convert USD/hour to the contract's micro-USD integer unit. */
export function toMicroUsd(usd: number): bigint {
  return BigInt(Math.round(usd * 1_000_000));
}

export function fromMicroUsd(microUsd: bigint): number {
  return Number(microUsd) / 1_000_000;
}

/** Submit the attestation and wait for it to be mined. */
export async function attestIncident(params: {
  agentWallet: string;
  agentURI: string;
  incidentType: string;
  wasteUsdPerHour: number;
  confidence: number;
  evidenceHash: string;
}): Promise<ChainAttestation> {
  const agentId = await ensureAgentRegistered(params.agentWallet, params.agentURI);
  const confidence = Math.max(0, Math.min(100, Math.round(params.confidence * 100)));

  const tx = await registry.attestIncident(
    agentId,
    params.incidentType,
    toMicroUsd(params.wasteUsdPerHour),
    confidence,
    params.evidenceHash,
  );
  log.info(`attestIncident submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  if (!receipt) throw new Error(`attestIncident tx ${tx.hash} produced no receipt`);
  if (receipt.status !== 1) throw new Error(`attestIncident tx ${tx.hash} reverted`);

  log.info(`attestation confirmed in block ${receipt.blockNumber}`);

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    agentId: agentId.toString(),
    explorerUrl: explorerTxUrl(tx.hash),
    attestedAt: new Date().toISOString(),
  };
}

export interface OnChainIncident {
  incidentType: string;
  costUsdPerHour: number;
  confidence: number;
  evidenceHash: string;
  timestamp: string;
  attestedBy: string;
}

/** Read an agent's efficiency history straight from the contract. */
export async function getHistory(agentWallet: string): Promise<{
  agentId: string;
  registered: boolean;
  agentURI: string | null;
  incidents: OnChainIncident[];
  totalCostUsdPerHour: number;
  explorerUrl: string;
}> {
  const agentId = await registry.resolveAgentId(agentWallet);
  if (agentId === 0n) {
    return {
      agentId: "0",
      registered: false,
      agentURI: null,
      incidents: [],
      totalCostUsdPerHour: 0,
      explorerUrl: explorerAddressUrl(config.EFFICIENCY_REGISTRY_ADDRESS),
    };
  }

  const [agent, history] = await Promise.all([
    registry.getAgent(agentId),
    registry.getHistory(agentId),
  ]);

  const incidents: OnChainIncident[] = history.map((row) => ({
    incidentType: row[0],
    costUsdPerHour: fromMicroUsd(row[1]),
    confidence: Number(row[2]),
    evidenceHash: row[3],
    timestamp: new Date(Number(row[4]) * 1000).toISOString(),
    attestedBy: row[5],
  }));

  return {
    agentId: agentId.toString(),
    registered: true,
    agentURI: agent.agentURI,
    incidents,
    totalCostUsdPerHour: fromMicroUsd(agent.totalCostImpactMicroUsd),
    explorerUrl: explorerAddressUrl(config.EFFICIENCY_REGISTRY_ADDRESS),
  };
}
