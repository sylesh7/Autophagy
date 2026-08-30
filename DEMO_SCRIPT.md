# Autophagy — 4-Minute Demo Script

Six beats, real commands, nothing staged. The cluster, the `retry-loop-agent`, and the Base
Sepolia transaction are all live during the take — cut around wait time, never around a faked
result. See [`README.md § 14`](./README.md#14-research-and-prior-art) for the sourced case that
the underlying problem is real, and [`§ 12`](./README.md#12-demo-structure) for the one-paragraph
summary of this same flow.

---

## 0:00–0:25 — Cold open: the calm dashboard lies

**Show:** Fleet Overview page. Everything green. Metric cards ticking over normally.

**Say:**
> "This is a healthy fleet. Every agent is under budget. And it's about to hide real waste from
> you — because nothing here is watching what these agents are actually doing."

---

## 0:25–0:55 — The problem, in three patterns

**Show:** Quick cut across three receipts: the retry-loop agent's log tail, the two
duplicate-task pods, an idle "forgotten" pod — real pods, real cluster.

**Say:**
> "A retry loop, a duplicated task, a forgotten allocation — all three sit comfortably under any
> spend cap, because a spend cap only ever asks how much, never whether the work was real. Cloud
> waste hit 29% this year for exactly this reason — AI workloads spinning up faster than anyone
> can track them."

---

## 0:55–1:15 — The real stack, already running

**Show:** Two terminal panes, both already up — a glance cut, not a live boot. Confirms nothing
is mocked.

**Say:**
> "No simulation mode. Real Kubernetes, real metrics-server, a contract already live on Base
> Sepolia."

```bash
cd backend && npm run cluster:up && npm run dev
cd frontend && npm run dev
```

---

## 1:15–2:20 — Live verdict: two identical pods, two different answers

**Show:** Live Demo page. Click "Force a polling window now." `standby-agent` and
`dead-allocation-agent` panels update side by side — same CPU, same zero activity. The incident
feed below then picks up the `retry-loop-agent`'s `RETRY_LOOP` flag too.

**Say:**
> "Same reservation. Same zero CPU. Same empty log. No threshold on earth can tell these two pods
> apart — but watch." *[verdicts land]* "`standby-agent`: legitimate, 92% — it declared its own
> intent. `dead-allocation-agent`: waste, 78% — nothing did. That's a model reasoning about
> intent, not a rule tripping a wire. And underneath, the retry-loop agent that's been quietly
> re-attempting the same task fourteen times just got flagged too."

```
POST /api/watch/poll   (the "Force a polling window now" button, live)
```

---

## 2:20–3:05 — Approve, and prove it actually happened

**Show:** Approve / Review page. Read the Diagnostician's reasoning and the Negotiator's cost
figure out loud on screen. Click **Approve**. Cut to a fresh `kubectl get pods` showing the pod
genuinely terminating.

**Say:**
> "Nothing executes without a human. I approve — that's the real `kubectl` action landing against
> the live cluster, right now, not a claim in a dashboard." *[pod state changes on screen]*
> "Re-queried, not assumed."

```bash
kubectl get pods -n autophagy -w
```

---

## 3:05–3:40 — The part nobody else has: a public record

**Show:** Browser tab flips to `sepolia.basescan.org`, the live contract address, the fresh
`IncidentAttested` transaction. Then the agent's own on-chain history page.

**Say:**
> "That approval just wrote to a public contract on Base Sepolia — anyone, not just us, can pull
> up this exact agent's efficiency history before deciding whether to hire it again. A cost
> dashboard can't do that. Neither can a budget cap. This is the part that doesn't exist anywhere
> else."

```
GET /api/agents/:wallet/history
open https://sepolia.basescan.org/address/0xFc422Ec82694A5F21D176b1E199b1AEB2deD4Ec9
```

---

## 3:40–4:00 — Close

**Show:** Cut back to Fleet Overview — same calm green screen as the cold open, now genuinely
earned. Hold on the wordmark.

**Say:**
> "Budgets check how much was spent. Autophagy checks whether the work was real — and remembers,
> publicly, when it wasn't."

---

## Pre-roll checklist

- [ ] `backend` and `frontend` dev servers both running, cluster reachable (`GET /api/health` returns `200`)
- [ ] `retry-loop-agent`, `standby-agent`, `dead-allocation-agent`, and the duplicate-task pods all `Running`
- [ ] At least one prior polling window has already run, so the panels aren't empty on first paint
- [ ] Base Sepolia signer wallet funded — `attestIncident()` will revert on a dry tank
- [ ] `sepolia.basescan.org` tab pre-opened to the registry address, ready to refresh on cue
- [ ] Screen recorder capturing both the browser and the terminal panes in one shot
