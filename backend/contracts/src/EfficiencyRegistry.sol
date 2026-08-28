// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EfficiencyRegistry
 * @notice A public, portable efficiency reputation record for autonomous agents.
 *
 * Autophagy detects behavioral waste in an agent fleet — retry loops, duplicated
 * work, dead allocations — and, once a human has approved the finding, commits it
 * here. The point is portability: any other orchestrator or marketplace can read
 * an agent's efficiency history before deciding whether to hire it, without
 * trusting Autophagy's own dashboard or database.
 *
 * Relationship to ERC-8004: this mirrors the *pattern* of that spec's Identity
 * and Validation registries — agents are uint256 ids resolvable to an off-chain
 * registration URI, and findings are recorded as attestations carrying a hash
 * commitment to the evidence plus a 0-100 response value. It deliberately does
 * not claim conformance: ERC-8004's Identity Registry is ERC-721-based and its
 * Validation Registry models a request/response handshake between an agent and
 * an independent validator. Autophagy has a single attesting authority and no
 * validation request phase, so implementing those interfaces literally would
 * misrepresent what this contract does.
 *
 * Costs are stored in micro-USD (6 decimals) because Solidity has no floats and
 * a resource-waste figure below one cent is still meaningful when annualised.
 */
contract EfficiencyRegistry {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    struct Agent {
        uint256 agentId;
        address owner;
        address agentWallet;
        string agentURI;
        uint64 registeredAt;
        uint64 incidentCount;
        /// @dev Running total of attested waste, in micro-USD per hour.
        uint256 totalCostImpactMicroUsd;
        bool exists;
    }

    struct Incident {
        string incidentType;
        /// @dev Waste rate at time of detection, micro-USD per hour.
        uint256 costImpactMicroUsd;
        /// @dev Diagnostician confidence, 0-100, mirroring ERC-8004's response scale.
        uint8 confidence;
        /// @dev Commitment to the off-chain evidence bundle.
        bytes32 evidenceHash;
        uint64 timestamp;
        address attestedBy;
    }

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public owner;
    uint256 public nextAgentId = 1;

    mapping(uint256 => Agent) private _agents;
    mapping(uint256 => Incident[]) private _incidents;
    mapping(address => uint256) private _agentIdByWallet;
    /// @notice Addresses permitted to record findings.
    mapping(address => bool) public isAttestor;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed agentWallet,
        address indexed owner,
        string agentURI,
        uint64 timestamp
    );

    event AgentURIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    event IncidentAttested(
        uint256 indexed agentId,
        string indexed indexedIncidentType,
        string incidentType,
        uint256 costImpactMicroUsd,
        uint8 confidence,
        bytes32 evidenceHash,
        uint64 timestamp,
        address indexed attestedBy
    );

    event AttestorSet(address indexed attestor, bool allowed);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotAttestor();
    error AgentNotFound(uint256 agentId);
    error WalletAlreadyRegistered(address wallet, uint256 existingAgentId);
    error ZeroAddress();
    error EmptyIncidentType();
    error ConfidenceOutOfRange(uint8 confidence);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Reputation is only meaningful if it cannot be forged. Without this,
    ///      anyone could smear an agent's record with fabricated incidents.
    modifier onlyAttestor() {
        if (!isAttestor[msg.sender]) revert NotAttestor();
        _;
    }

    constructor() {
        owner = msg.sender;
        isAttestor[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AttestorSet(msg.sender, true);
    }

    // -------------------------------------------------------------------------
    // Identity
    // -------------------------------------------------------------------------

    /**
     * @notice Register an agent identity before it starts doing work.
     * @param agentWallet The agent's own address, used to resolve it later.
     * @param agentURI Resolvable pointer to the agent's registration document.
     * @return agentId The newly assigned identifier.
     */
    function registerAgent(address agentWallet, string calldata agentURI)
        external
        returns (uint256 agentId)
    {
        if (agentWallet == address(0)) revert ZeroAddress();
        uint256 existing = _agentIdByWallet[agentWallet];
        if (existing != 0) revert WalletAlreadyRegistered(agentWallet, existing);

        agentId = nextAgentId++;
        _agents[agentId] = Agent({
            agentId: agentId,
            owner: msg.sender,
            agentWallet: agentWallet,
            agentURI: agentURI,
            registeredAt: uint64(block.timestamp),
            incidentCount: 0,
            totalCostImpactMicroUsd: 0,
            exists: true
        });
        _agentIdByWallet[agentWallet] = agentId;

        emit AgentRegistered(agentId, agentWallet, msg.sender, agentURI, uint64(block.timestamp));
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        Agent storage agent = _agents[agentId];
        if (!agent.exists) revert AgentNotFound(agentId);
        if (msg.sender != agent.owner && msg.sender != owner) revert NotOwner();
        agent.agentURI = newURI;
        emit AgentURIUpdated(agentId, newURI, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Attestation
    // -------------------------------------------------------------------------

    /**
     * @notice Record a human-approved waste finding, permanently and publicly.
     * @param agentId The agent the finding is about.
     * @param incidentType Waste category, e.g. "RETRY_LOOP".
     * @param costImpactMicroUsd Measured waste rate in micro-USD per hour.
     * @param confidence Diagnostician confidence, 0-100.
     * @param evidenceHash Commitment to the off-chain evidence bundle.
     */
    function attestIncident(
        uint256 agentId,
        string calldata incidentType,
        uint256 costImpactMicroUsd,
        uint8 confidence,
        bytes32 evidenceHash
    ) external onlyAttestor {
        Agent storage agent = _agents[agentId];
        if (!agent.exists) revert AgentNotFound(agentId);
        if (bytes(incidentType).length == 0) revert EmptyIncidentType();
        if (confidence > 100) revert ConfidenceOutOfRange(confidence);

        _incidents[agentId].push(
            Incident({
                incidentType: incidentType,
                costImpactMicroUsd: costImpactMicroUsd,
                confidence: confidence,
                evidenceHash: evidenceHash,
                timestamp: uint64(block.timestamp),
                attestedBy: msg.sender
            })
        );

        unchecked {
            agent.incidentCount += 1;
            agent.totalCostImpactMicroUsd += costImpactMicroUsd;
        }

        emit IncidentAttested(
            agentId,
            incidentType,
            incidentType,
            costImpactMicroUsd,
            confidence,
            evidenceHash,
            uint64(block.timestamp),
            msg.sender
        );
    }

    // -------------------------------------------------------------------------
    // Public reads — queryable by anyone, not just Autophagy
    // -------------------------------------------------------------------------

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = _agents[agentId];
        if (!agent.exists) revert AgentNotFound(agentId);
        return agent;
    }

    function getHistory(uint256 agentId) external view returns (Incident[] memory) {
        if (!_agents[agentId].exists) revert AgentNotFound(agentId);
        return _incidents[agentId];
    }

    /// @notice Headline reputation figures for an agent.
    function getSummary(uint256 agentId)
        external
        view
        returns (uint64 incidentCount, uint256 totalCostImpactMicroUsd, uint64 lastIncidentAt)
    {
        Agent memory agent = _agents[agentId];
        if (!agent.exists) revert AgentNotFound(agentId);
        Incident[] memory history = _incidents[agentId];
        lastIncidentAt = history.length == 0 ? 0 : history[history.length - 1].timestamp;
        return (agent.incidentCount, agent.totalCostImpactMicroUsd, lastIncidentAt);
    }

    function resolveAgentId(address agentWallet) external view returns (uint256) {
        return _agentIdByWallet[agentWallet];
    }

    function totalAgents() external view returns (uint256) {
        return nextAgentId - 1;
    }

    // -------------------------------------------------------------------------
    // Administration
    // -------------------------------------------------------------------------

    function setAttestor(address attestor, bool allowed) external onlyOwner {
        if (attestor == address(0)) revert ZeroAddress();
        isAttestor[attestor] = allowed;
        emit AttestorSet(attestor, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
