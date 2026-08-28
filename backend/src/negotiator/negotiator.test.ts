import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Anomaly, Diagnosis, IncidentType, PodObservation } from "../types.js";
import { negotiate } from "./negotiator.js";
import { HOURS_PER_MONTH, PRICING_PROFILES, costPerHour } from "./pricing.js";

function anomaly(incidentType: IncidentType, over: Partial<PodObservation> = {}): Anomaly {
  const latest: PodObservation = {
    name: "agent-1",
    uid: "uid-1",
    namespace: "autophagy",
    phase: "Running",
    labels: {},
    annotations: {},
    startedAt: new Date().toISOString(),
    ageSeconds: 3600,
    requestedCpuMilli: 1000,
    requestedMemoryBytes: 2 ** 30,
    actualCpuMilli: 100,
    actualMemoryBytes: 2 ** 29,
    cpuUtilisation: 0.1,
    memoryUtilisation: 0.5,
    restartCount: 0,
    activity: null,
    ...over,
  };

  return {
    id: `uid-1:${incidentType}`,
    podName: latest.name,
    podUid: latest.uid,
    namespace: latest.namespace,
    incidentType,
    sustainedWindows: 3,
    observedForSeconds: 3600,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    evidence: [],
    mitigations: [],
    latest,
    cpuUtilisationSeries: [0.1, 0.1, 0.1],
    memoryUtilisationSeries: [0.5, 0.5, 0.5],
    relatedPods: [],
  };
}

const diagnosis: Diagnosis = {
  verdict: "WASTE",
  confidence: 0.92,
  reasoning: "test",
  incidentType: "RETRY_LOOP",
  model: "test-model",
  diagnosedAt: new Date().toISOString(),
  tokensUsed: null,
};

describe("pricing", () => {
  it("uses the published Fargate rate for one vCPU-hour plus one GB-hour", () => {
    const profile = PRICING_PROFILES["aws-fargate"]!;
    const cost = costPerHour(profile, 1000, 2 ** 30);
    assert.equal(cost, profile.usdPerVcpuHour + profile.usdPerGbHour);
  });
});

describe("negotiate — cost basis by signature", () => {
  it("charges the full reservation for a retry loop, since nothing completed", () => {
    const proposal = negotiate(anomaly("RETRY_LOOP"), diagnosis);
    const profile = PRICING_PROFILES["aws-fargate"]!;

    assert.equal(proposal.reclaimedCpuMilli, 1000);
    assert.equal(proposal.reclaimedMemoryBytes, 2 ** 30);
    assert.equal(
      proposal.wasteUsdPerHour,
      Number((profile.usdPerVcpuHour + profile.usdPerGbHour).toFixed(6)),
    );
  });

  it("charges only the measured gap for over-allocation", () => {
    const proposal = negotiate(anomaly("SUSTAINED_OVER_ALLOCATION"), diagnosis);

    // Requested 1000m / 1Gi, actually using 100m / 0.5Gi.
    assert.equal(proposal.reclaimedCpuMilli, 900);
    assert.equal(proposal.reclaimedMemoryBytes, 2 ** 29);
  });

  it("charges the full reservation of a redundant duplicate", () => {
    const proposal = negotiate(anomaly("ORPHANED_DUPLICATE"), diagnosis);
    assert.equal(proposal.reclaimedCpuMilli, 1000);
  });
});

describe("negotiate — proposed action", () => {
  const cases: Array<[IncidentType, string]> = [
    ["RETRY_LOOP", "TERMINATE"],
    ["DEAD_ALLOCATION", "TERMINATE"],
    ["ORPHANED_DUPLICATE", "REASSIGN"],
    ["SUSTAINED_OVER_ALLOCATION", "SCALE_DOWN"],
  ];

  for (const [incidentType, expected] of cases) {
    it(`proposes ${expected} for ${incidentType}`, () => {
      assert.equal(negotiate(anomaly(incidentType), diagnosis).action, expected);
    });
  }
});

describe("negotiate — projections", () => {
  it("projects monthly cost on the standard 730-hour basis", () => {
    const proposal = negotiate(anomaly("RETRY_LOOP"), diagnosis);
    assert.equal(
      proposal.projectedUsdPerMonth,
      Number((proposal.wasteUsdPerHour * HOURS_PER_MONTH).toFixed(2)),
    );
  });

  it("reports observed waste over the actual observation window", () => {
    const proposal = negotiate(anomaly("RETRY_LOOP"), diagnosis);
    // Observed for exactly one hour.
    assert.equal(proposal.wasteUsdObserved, proposal.wasteUsdPerHour);
  });

  it("cites the pricing source so the figure is checkable", () => {
    const proposal = negotiate(anomaly("RETRY_LOOP"), diagnosis);
    assert.match(proposal.pricingSource, /aws\.amazon\.com/);
    assert.match(proposal.pricingProfile, /Fargate/);
  });
});
