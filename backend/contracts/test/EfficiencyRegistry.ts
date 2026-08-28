import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

/**
 * These run against a real EVM (Hardhat's in-process chain), not a stub — the
 * same bytecode that gets deployed to Base Sepolia.
 */
describe("EfficiencyRegistry", () => {
  async function deploy() {
    const [deployer, backendSigner, stranger, agentWallet, otherWallet] =
      await ethers.getSigners();
    const registry = await ethers.deployContract("EfficiencyRegistry");
    await registry.setAttestor(backendSigner.address, true);
    return { registry, deployer, backendSigner, stranger, agentWallet, otherWallet };
  }

  // ------------------------------------------------------------------ identity

  describe("identity", () => {
    it("assigns incrementing agent ids", async () => {
      const { registry, agentWallet, otherWallet } = await deploy();

      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");
      await registry.registerAgent(otherWallet.address, "ipfs://agent-two");

      expect(await registry.resolveAgentId(agentWallet.address)).to.equal(1n);
      expect(await registry.resolveAgentId(otherWallet.address)).to.equal(2n);
      expect(await registry.totalAgents()).to.equal(2n);
    });

    it("stores the identity and resolves it by wallet", async () => {
      const { registry, deployer, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      const agent = await registry.getAgent(1n);
      expect(agent.agentWallet).to.equal(agentWallet.address);
      expect(agent.owner).to.equal(deployer.address);
      expect(agent.agentURI).to.equal("ipfs://agent-one");
      expect(agent.incidentCount).to.equal(0n);
      expect(agent.exists).to.equal(true);
    });

    it("rejects a wallet that is already registered", async () => {
      const { registry, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      await expect(registry.registerAgent(agentWallet.address, "ipfs://duplicate"))
        .to.be.revertedWithCustomError(registry, "WalletAlreadyRegistered")
        .withArgs(agentWallet.address, 1n);
    });

    it("rejects the zero address", async () => {
      const { registry } = await deploy();
      await expect(
        registry.registerAgent(ethers.ZeroAddress, "ipfs://nobody"),
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("returns zero for an unknown wallet", async () => {
      const { registry, stranger } = await deploy();
      expect(await registry.resolveAgentId(stranger.address)).to.equal(0n);
    });

    it("lets the owner update the agent URI but not a stranger", async () => {
      const { registry, agentWallet, stranger } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      await registry.setAgentURI(1n, "ipfs://updated");
      expect((await registry.getAgent(1n)).agentURI).to.equal("ipfs://updated");

      await expect(
        registry.connect(stranger).setAgentURI(1n, "ipfs://hijacked"),
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });
  });

  // --------------------------------------------------------------- attestation

  describe("attestation", () => {
    it("appends to history and accumulates cost", async () => {
      const { registry, backendSigner, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      const evidenceA = ethers.keccak256(ethers.toUtf8Bytes("evidence-a"));
      const evidenceB = ethers.keccak256(ethers.toUtf8Bytes("evidence-b"));

      await registry.connect(backendSigner).attestIncident(1n, "RETRY_LOOP", 40_480n, 92, evidenceA);
      await registry
        .connect(backendSigner)
        .attestIncident(1n, "DEAD_ALLOCATION", 12_000n, 78, evidenceB);

      const history = await registry.getHistory(1n);
      expect(history.length).to.equal(2);
      expect(history[0].incidentType).to.equal("RETRY_LOOP");
      expect(history[0].costImpactMicroUsd).to.equal(40_480n);
      expect(history[0].confidence).to.equal(92n);
      expect(history[0].evidenceHash).to.equal(evidenceA);
      expect(history[0].attestedBy).to.equal(backendSigner.address);
      expect(history[1].incidentType).to.equal("DEAD_ALLOCATION");

      const [count, totalCost] = await registry.getSummary(1n);
      expect(count).to.equal(2n);
      expect(totalCost).to.equal(52_480n);
    });

    /** Reputation is worthless if an unauthorised caller can forge it. */
    it("rejects an attestation from a non-attestor", async () => {
      const { registry, stranger, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      await expect(
        registry.connect(stranger).attestIncident(1n, "RETRY_LOOP", 1n, 50, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(registry, "NotAttestor");
    });

    it("rejects an attestation against an unknown agent", async () => {
      const { registry, backendSigner } = await deploy();

      await expect(
        registry.connect(backendSigner).attestIncident(99n, "RETRY_LOOP", 1n, 50, ethers.ZeroHash),
      )
        .to.be.revertedWithCustomError(registry, "AgentNotFound")
        .withArgs(99n);
    });

    it("rejects a confidence above 100", async () => {
      const { registry, backendSigner, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      await expect(
        registry.connect(backendSigner).attestIncident(1n, "RETRY_LOOP", 1n, 101, ethers.ZeroHash),
      )
        .to.be.revertedWithCustomError(registry, "ConfidenceOutOfRange")
        .withArgs(101);
    });

    it("rejects an empty incident type", async () => {
      const { registry, backendSigner, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      await expect(
        registry.connect(backendSigner).attestIncident(1n, "", 1n, 50, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(registry, "EmptyIncidentType");
    });

    it("emits IncidentAttested with the recorded values", async () => {
      const { registry, backendSigner, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");
      const evidence = ethers.keccak256(ethers.toUtf8Bytes("evidence-a"));

      const tx = await registry
        .connect(backendSigner)
        .attestIncident(1n, "RETRY_LOOP", 40_480n, 92, evidence);
      await expect(tx).to.emit(registry, "IncidentAttested");

      // The indexed string arrives as a hash, so assert on the unindexed copy
      // the contract emits alongside it.
      const events = await registry.queryFilter(registry.filters.IncidentAttested(), -1);
      expect(events.length).to.equal(1);
      const args = events[0].args;
      expect(args.agentId).to.equal(1n);
      expect(args.incidentType).to.equal("RETRY_LOOP");
      expect(args.costImpactMicroUsd).to.equal(40_480n);
      expect(args.confidence).to.equal(92n);
      expect(args.evidenceHash).to.equal(evidence);
      expect(args.attestedBy).to.equal(backendSigner.address);
    });

    /** The history must be readable by anyone — that is the whole point. */
    it("exposes history to any caller", async () => {
      const { registry, backendSigner, stranger, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");
      await registry
        .connect(backendSigner)
        .attestIncident(1n, "RETRY_LOOP", 40_480n, 92, ethers.ZeroHash);

      const history = await registry.connect(stranger).getHistory(1n);
      expect(history.length).to.equal(1);
    });

    it("accumulates cost across many attestations", async () => {
      const { registry, backendSigner, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");

      const amounts = [0n, 1n, 40_480n, 2n ** 64n, 999_999_999n];
      for (const amount of amounts) {
        await registry
          .connect(backendSigner)
          .attestIncident(1n, "RETRY_LOOP", amount, 50, ethers.ZeroHash);
      }

      const [count, total] = await registry.getSummary(1n);
      expect(count).to.equal(BigInt(amounts.length));
      expect(total).to.equal(amounts.reduce((a, b) => a + b, 0n));
    });
  });

  // --------------------------------------------------------------------- admin

  describe("administration", () => {
    it("revokes attestor access", async () => {
      const { registry, backendSigner, agentWallet } = await deploy();
      await registry.registerAgent(agentWallet.address, "ipfs://agent-one");
      await registry.setAttestor(backendSigner.address, false);

      await expect(
        registry.connect(backendSigner).attestIncident(1n, "RETRY_LOOP", 1n, 50, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(registry, "NotAttestor");
    });

    it("rejects setAttestor from a non-owner", async () => {
      const { registry, stranger } = await deploy();

      await expect(
        registry.connect(stranger).setAttestor(stranger.address, true),
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("transfers ownership and drops the old owner's rights", async () => {
      const { registry, deployer, stranger } = await deploy();

      await registry.transferOwnership(stranger.address);
      expect(await registry.owner()).to.equal(stranger.address);

      await expect(
        registry.connect(deployer).setAttestor(deployer.address, true),
      ).to.be.revertedWithCustomError(registry, "NotOwner");
    });

    it("makes the deployer both owner and first attestor", async () => {
      const [deployer] = await ethers.getSigners();
      const registry = await ethers.deployContract("EfficiencyRegistry");

      expect(await registry.owner()).to.equal(deployer.address);
      expect(await registry.isAttestor(deployer.address)).to.equal(true);
    });
  });
});
