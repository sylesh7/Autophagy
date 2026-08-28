# Autophagy — Backend

Behavioral waste detection and on-chain efficiency reputation for autonomous agent fleets.

This is the Watcher → Diagnostician → Negotiator pipeline, the human approval gate, the
Kubernetes integration, and the `EfficiencyRegistry` contract.

## Nothing here is simulated

The backend validates every external dependency at boot and **refuses to start** if one is
missing. There is no demo mode, no seeded data, and no fallback that invents numbers:

- **Cluster metrics** come from a live `metrics-server`. A pod with no metrics sample yet
  reports `null`, never an estimate.
- **Agent activity** is parsed out of real pod logs via the Kubernetes API.
- **Verdicts** come from a real model call. If the model is unreachable, the incident is
  visibly `FAILED` — it is never downgraded to a locally-computed guess, because a fake
  verdict is indistinguishable from a real one in the UI.
- **Costs** use published cloud pricing, with the source and as-of date attached.
- **Attestations** are real transactions on Base Sepolia.

---

## Prerequisites

| | |
|---|---|
| Node | 20+ (developed on 26) |
| Kubernetes | Docker Desktop's built-in cluster, or minikube |
| Reasoning provider | A Groq key (free, no card) — or xAI / OpenRouter with credits |
| Base Sepolia | A funded testnet wallet ([faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)) |

## Setup

```bash
npm install
cp .env.example .env      # then fill it in
npm run cluster:up        # cluster + metrics-server + demo agents
npm run contracts:deploy  # deploys EfficiencyRegistry, prints the address
npm run dev
```

`npm run cluster:up` is idempotent — safe to re-run.

### Choosing a reasoning provider

The Diagnostician is the one component with a running cost. All three providers expose an
OpenAI-compatible `/chat/completions` endpoint with `json_schema` structured output, so
switching is configuration only:

| Provider | Default model | Cost | Billing |
|---|---|---|---|
| `groq` *(default)* | `openai/gpt-oss-120b` | free | **No card required** |
| `xai` | `grok-4.3` | $1.25 / $2.50 per M | Credits must be purchased |
| `openrouter` | `anthropic/claude-sonnet-4.5` | varies | Credits must be purchased |

```bash
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...       # https://console.groq.com/keys
# LLM_MODEL=openai/gpt-oss-20b
```

Groq is the default because its free tier needs no payment method — both xAI and OpenRouter
reject calls once their balance hits zero, which is a bad surprise mid-demo.

Whatever model you pick **must support `response_format: json_schema` with `strict: true`**,
or verdicts come back as prose and fail validation rather than being silently accepted. On
Groq only three models qualify: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`,
`qwen/qwen3.8-27b`. On xAI the valid ids are `grok-4.6`, `grok-4.5`, `grok-4.3` and the
`grok-4.20-*` variants — there is no "fast" variant, despite what some third-party pricing
pages list.

A verdict costs roughly 1,570 tokens: free on Groq, about $0.002 on `grok-4.3`.

### Deployed contract

Already live on Base Sepolia — reuse it rather than deploying your own, so the whole team
shares one agent history:

**`0xFc422Ec82694A5F21D176b1E199b1AEB2deD4Ec9`**
([Basescan](https://sepolia.basescan.org/address/0xFc422Ec82694A5F21D176b1E199b1AEB2deD4Ec9))

The deploying key becomes both owner and first attestor. If you deploy your own from a
different key than the backend signs with, grant it: `setAttestor(backendAddress, true)`.

---

## Layout

```
src/
  config.ts              env validation — fails fast, never defaults around a missing dep
  k8s/
    client.ts            KubeConfig, CoreV1Api, Metrics, snapshots, cluster actions
    quantity.ts          Kubernetes Quantity parser (nanocores, KiB, binary/decimal SI)
  watcher/
    watcher.ts           polling loop, per-pod history, pipeline orchestration
    signatures.ts        the four detection rules
    activity.ts          parses AUTOPHAGY log lines out of pod stdout
  diagnostician/
    diagnostician.ts     provider-agnostic model call, strict JSON schema, no fallback
    prompt.ts            system prompt + evidence payload + verdict schema
  negotiator/
    negotiator.ts        cost basis, action selection
    pricing.ts           published cloud rates, with sources
  chain/registry.ts      ethers v6 wrapper over EfficiencyRegistry
  pipeline/remediate.ts  the human approval gate: cluster action, then attestation
  store/incidents.ts     session state (the durable record is the chain)
  routes/api.ts          REST + SSE

contracts/               Hardhat 3 project — EfficiencyRegistry.sol, Ignition deploy
k8s/                     setup.mjs, namespace, five demo agent workloads
```

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Per-dependency status; 503 if cluster or chain is down |
| `GET /api/watch` | Latest cluster snapshot (`?live=true` forces a fresh read) |
| `POST /api/watch/poll` | Force one full pipeline pass |
| `POST /api/diagnose` | Re-run a verdict by hand — `{ incidentId }` |
| `POST /api/negotiate` | Re-cost a confirmed verdict — `{ incidentId }` |
| `POST /api/approve` | **The human gate.** Real cluster action + attestation |
| `POST /api/reject` | Decline a proposal |
| `GET /api/incidents` | All incidents + session stats |
| `GET /api/agents/:address/history` | Efficiency history read from the contract |
| `GET /api/pods/:name/series` | Utilisation series for the detail chart |
| `GET /api/events` | SSE stream (`snapshot`, `incident`) for the live dashboard |

## Detection rules

A pattern must persist `SUSTAINED_WINDOWS` (default 3) consecutive polls before it is
flagged, so a single noisy metrics reading cannot trigger anything.

| Signature | Fires when |
|---|---|
| `RETRY_LOOP` | Same task ID attempted ≥5 times with zero completions |
| `ORPHANED_DUPLICATE` | Two agents hold the same unfinished task ID concurrently |
| `DEAD_ALLOCATION` | CPU under 5% of request for the whole window, zero task activity |
| `SUSTAINED_OVER_ALLOCATION` | CPU never exceeds 20% of request across the window |

The rules only ever **nominate** a pattern and attach the measured evidence plus any
mitigations. They never decide waste — that is the Diagnostician's judgment.

Agents report their own work on stdout in one line-oriented format:

```
AUTOPHAGY attempt task=<taskId>
AUTOPHAGY complete task=<taskId>
```

### Why the reasoning layer earns its place

`dead-allocation-agent` and `standby-agent` are **metrically identical** — same request,
same 0% utilisation, same zero activity. No threshold can separate them. The only
difference is a declared intent annotation, and on live data the Diagnostician splits them
correctly:

- `standby-agent` → **LEGITIMATE @ 92%** — *"annotated as standby capacity with a clear
  business justification… align perfectly with the stated purpose"*
- `dead-allocation-agent` → **WASTE @ 78%** — *"zero task attempts… no mitigations present,
  indicating genuine dead allocation"*

## Cost model

Waste basis depends on the signature, because the honest figure differs:

- **Retry loop / dead allocation** — the *whole* reservation. Zero completed work, so every
  core-hour bought nothing.
- **Orphaned duplicate** — the whole reservation of the redundant agent; only one output
  can be used.
- **Over-allocation** — only the measured gap. The pod does real work in an oversized box.

Rates are real published list prices (`aws-fargate` or `gcp-autopilot` via
`PRICING_PROFILE`), and every proposal reports which profile and source produced its number.

## Contract

`EfficiencyRegistry` mirrors the *pattern* of ERC-8004's Identity and Validation registries:
agents are `uint256` ids resolvable to a registration URI, and findings are attestations
carrying a hash commitment to the evidence plus a 0–100 confidence.

It deliberately does **not** claim conformance — ERC-8004's Identity Registry is ERC-721
based and its Validation Registry models a request/response handshake with an independent
validator. Autophagy has a single attesting authority and no validation request phase, so
implementing those interfaces literally would misrepresent what this does.

Attestation is permissioned (`onlyAttestor`). Reputation that anyone can forge is worthless.
Reads are open to everyone — that is the entire point.

## Tests

```bash
npm test                  # 39 — quantity parsing, detection rules, cost maths
npm run contracts:test    # 18 — identity, attestation, access control
```

The backend tests construct `PodObservation` inputs directly to exercise the rules. That is
the unit under test; the runtime path only ever builds observations from live cluster reads.

---

## Troubleshooting

Every item here was hit during setup on Windows.

**`'minikube' is not installed or not on PATH` right after installing it.**
winget updates the machine PATH, but shells opened beforehand keep the old one.
`setup.mjs` resolves tools by absolute path to work around this. Reopening the terminal also
fixes it.

**The setup script used to fail only under `npm run`.**
On Windows, `npm run` resolves `bash` to *WSL's* bash, which has a different filesystem
layout (`/mnt/c`, not `/c`) and its own `~/.kube/config`. A cluster created from inside WSL
is invisible to the backend, which runs on Windows Node against the Windows kubeconfig.
This is why setup is a Node script, not a shell script — do not port it back to `.sh`.

**Pods stuck in `ImagePullBackOff` with `DeadlineExceeded`.**
Docker Desktop routes in-cluster pulls through a pull-through cache, and containerd applies
a deadline to the whole pull. On a slow connection the cache is still fetching upstream when
that deadline expires. `setup.mjs` pre-pulls images on the host (no deadline) and imports
them into the node's containerd. Note `docker cp` silently no-ops against Docker Desktop's
hidden `desktop-control-plane` container — the archive has to be streamed over stdin.

**`402 … requested up to 64000 tokens`.**
Without an explicit `max_tokens`, some providers (OpenRouter among them) reserve the model's
entire context window against your balance. Capped via `DIAGNOSTICIAN_MAX_TOKENS`
(default 700); a full request costs roughly 1,570 tokens. If you still see 402 the account is
genuinely out of credits — add some, switch `LLM_PROVIDER`, or point `LLM_MODEL` at a cheaper
model. Any replacement must support `response_format: json_schema`, or verdicts come back as
prose and fail validation.

**`registerAgent … did not produce an agent id`, but the transaction succeeded.**
Public RPC endpoints are load-balanced, so a read issued immediately after a confirmed write
can hit a node that has not applied the block yet. The agent id is now taken from the
transaction receipt's own event rather than a follow-up read.

**`podState: TERMINATING` after an approved termination.**
That is success. Kubernetes sets a deletion timestamp and lets the container shut down
gracefully, so the pod lingers briefly. `verified` is true for both `GONE` and `TERMINATING`.

---

## Known gaps

- **Session state is in memory.** Restarting clears incidents. The durable record is the
  chain — a fresh backend can rebuild an agent's history from `getHistory`.
- **One incident per pattern, not per pod.** A pod can hold two open incidents if its
  signature changes (e.g. over-allocation, then duplicate). Harmless but noisy in the feed.
- **Attestation requires an `autophagy.io/agent-wallet` annotation.** Without it the
  incident fails rather than attaching a permanent public record to a guessed identity.
- **`SCALE_DOWN` scales the owning Deployment to zero.** Fine for the demo; a production
  version would compute a right-sized replica count.
