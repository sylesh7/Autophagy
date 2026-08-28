import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PodObservation } from "../types.js";
import { parseActivity } from "./activity.js";
import { evaluate } from "./signatures.js";

/**
 * These construct PodObservation inputs directly. That is the unit under test —
 * the rules themselves — and is separate from the runtime path, which only ever
 * builds observations from live cluster reads.
 */
function observation(overrides: Partial<PodObservation> = {}): PodObservation {
  return {
    name: "agent-1",
    uid: "uid-1",
    namespace: "autophagy",
    phase: "Running",
    labels: {},
    annotations: {},
    startedAt: new Date().toISOString(),
    ageSeconds: 600,
    requestedCpuMilli: 200,
    requestedMemoryBytes: 128 * 2 ** 20,
    actualCpuMilli: 2,
    actualMemoryBytes: 8 * 2 ** 20,
    cpuUtilisation: 0.01,
    memoryUtilisation: 0.06,
    restartCount: 0,
    activity: null,
    ...overrides,
  };
}

const WINDOWS = 3;

function repeat(obs: PodObservation, n = WINDOWS): PodObservation[] {
  return Array.from({ length: n }, (_, i) =>
    ({ ...obs, ageSeconds: obs.ageSeconds - (n - 1 - i) * 10 }),
  );
}

describe("evaluate — gating", () => {
  it("returns nothing before the pattern has persisted long enough", () => {
    const history = repeat(observation(), 2);
    assert.equal(evaluate(history, [], WINDOWS), null);
  });

  it("ignores pods that are not Running", () => {
    const history = repeat(observation({ phase: "Pending" }));
    assert.equal(evaluate(history, [], WINDOWS), null);
  });

  it("does not flag a healthy agent doing real work", () => {
    const activity = parseActivity(
      [
        "AUTOPHAGY attempt task=ledger-1",
        "AUTOPHAGY complete task=ledger-1",
        "AUTOPHAGY attempt task=ledger-2",
        "AUTOPHAGY complete task=ledger-2",
      ].join("\n"),
    );
    const history = repeat(
      observation({ actualCpuMilli: 300, cpuUtilisation: 1.5, memoryUtilisation: 0.6, activity }),
    );
    assert.equal(evaluate(history, [], WINDOWS), null);
  });
});

describe("evaluate — retry loop", () => {
  const retryLog = Array.from(
    { length: 14 },
    () => "AUTOPHAGY attempt task=settlement-4417",
  ).join("\n");

  it("flags many attempts with zero completions", () => {
    const history = repeat(
      observation({ activity: parseActivity(retryLog), cpuUtilisation: 0.8, actualCpuMilli: 160 }),
    );
    const anomaly = evaluate(history, [], WINDOWS);

    assert.equal(anomaly?.incidentType, "RETRY_LOOP");
    assert.ok(anomaly!.evidence.some((e) => e.includes("14 times")));
    assert.equal(anomaly!.sustainedWindows, WINDOWS);
  });

  it("does not flag repeated attempts that do complete", () => {
    const log = Array.from({ length: 14 }, (_, i) =>
      `AUTOPHAGY attempt task=t${i}\nAUTOPHAGY complete task=t${i}`,
    ).join("\n");
    const history = repeat(
      observation({ activity: parseActivity(log), cpuUtilisation: 0.8, actualCpuMilli: 160 }),
    );
    assert.equal(evaluate(history, [], WINDOWS), null);
  });
});

describe("evaluate — orphaned duplicate", () => {
  it("flags the same task held concurrently by two agents", () => {
    const shared = parseActivity("AUTOPHAGY attempt task=invoice-batch-99");
    const history = repeat(
      observation({ activity: shared, cpuUtilisation: 0.7, actualCpuMilli: 140 }),
    );
    const peer = observation({
      name: "agent-2",
      uid: "uid-2",
      activity: shared,
      cpuUtilisation: 0.7,
      actualCpuMilli: 140,
    });

    const anomaly = evaluate(history, [history[2]!, peer], WINDOWS);

    assert.equal(anomaly?.incidentType, "ORPHANED_DUPLICATE");
    assert.deepEqual(anomaly!.relatedPods, ["agent-2"]);
  });

  it("does not flag distinct tasks across agents", () => {
    const history = repeat(
      observation({
        activity: parseActivity("AUTOPHAGY attempt task=alpha"),
        cpuUtilisation: 0.7,
        actualCpuMilli: 140,
      }),
    );
    const peer = observation({
      name: "agent-2",
      uid: "uid-2",
      activity: parseActivity("AUTOPHAGY attempt task=beta"),
    });

    assert.equal(evaluate(history, [history[2]!, peer], WINDOWS), null);
  });
});

describe("evaluate — dead allocation", () => {
  it("flags an idle pod with no task activity at all", () => {
    const history = repeat(observation({ activity: parseActivity("runtime ready") }));
    const anomaly = evaluate(history, [], WINDOWS);

    assert.equal(anomaly?.incidentType, "DEAD_ALLOCATION");
    assert.ok(anomaly!.evidence.some((e) => e.includes("Zero task activity")));
  });

  it("surfaces a standby annotation as a mitigation rather than suppressing", () => {
    const history = repeat(
      observation({
        activity: parseActivity("runtime ready"),
        annotations: {
          "autophagy.io/standby": "true",
          "autophagy.io/standby-reason": "Reserved failover capacity",
        },
      }),
    );
    const anomaly = evaluate(history, [], WINDOWS);

    // Still reported — the reasoning layer decides, not the rule.
    assert.equal(anomaly?.incidentType, "DEAD_ALLOCATION");
    assert.ok(anomaly!.mitigations.some((m) => m.includes("Reserved failover capacity")));
  });

  it("treats a very new pod's idleness as a mitigation", () => {
    const history = repeat(
      observation({ ageSeconds: 30, activity: parseActivity("runtime ready") }),
    );
    const anomaly = evaluate(history, [], WINDOWS);
    assert.ok(anomaly!.mitigations.some((m) => m.includes("warm-up grace")));
  });

  it("does not flag when metrics are missing for part of the window", () => {
    const history = repeat(observation({ activity: parseActivity("runtime ready") }));
    history[0] = { ...history[0]!, cpuUtilisation: null, actualCpuMilli: null };
    assert.equal(evaluate(history, [], WINDOWS), null);
  });
});

describe("evaluate — sustained over-allocation", () => {
  it("flags a working pod in an oversized reservation", () => {
    const activity = parseActivity(
      ["AUTOPHAGY attempt task=a", "AUTOPHAGY complete task=a"].join("\n"),
    );
    const history = repeat(
      observation({ activity, cpuUtilisation: 0.12, actualCpuMilli: 24 }),
    );
    const anomaly = evaluate(history, [], WINDOWS);

    assert.equal(anomaly?.incidentType, "SUSTAINED_OVER_ALLOCATION");
  });
});
