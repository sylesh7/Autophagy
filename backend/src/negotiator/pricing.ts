/**
 * Real, publicly published on-demand pricing. These are the actual list rates
 * for the named regions, not illustrative placeholders — a cost figure shown to
 * a human before they approve an irreversible action has to be checkable.
 *
 * Rates move. Each profile carries the source and the date it was taken from,
 * so a stale number is visible rather than silently wrong, and every proposal
 * Autophagy emits reports which profile produced it.
 */

export interface PricingProfile {
  id: string;
  label: string;
  region: string;
  usdPerVcpuHour: number;
  usdPerGbHour: number;
  source: string;
  asOf: string;
}

export const PRICING_PROFILES: Record<string, PricingProfile> = {
  "aws-fargate": {
    id: "aws-fargate",
    label: "AWS Fargate (Linux/x86, on-demand)",
    region: "us-east-1",
    usdPerVcpuHour: 0.04048,
    usdPerGbHour: 0.004445,
    source: "https://aws.amazon.com/fargate/pricing/",
    asOf: "2026-08",
  },
  "gcp-autopilot": {
    id: "gcp-autopilot",
    label: "GKE Autopilot (general-purpose, on-demand)",
    region: "us-central1",
    usdPerVcpuHour: 0.0573,
    usdPerGbHour: 0.0063356,
    source: "https://cloud.google.com/kubernetes-engine/pricing",
    asOf: "2026-08",
  },
};

/** Hours in an average month, the standard basis for cloud monthly estimates. */
export const HOURS_PER_MONTH = 730;

export function getProfile(id: string): PricingProfile {
  const profile = PRICING_PROFILES[id];
  if (!profile) {
    throw new Error(
      `Unknown pricing profile "${id}". Available: ${Object.keys(PRICING_PROFILES).join(", ")}`,
    );
  }
  return profile;
}

export function costPerHour(
  profile: PricingProfile,
  cpuMilli: number,
  memoryBytes: number,
): number {
  const vcpu = cpuMilli / 1000;
  const gb = memoryBytes / 2 ** 30;
  return vcpu * profile.usdPerVcpuHour + gb * profile.usdPerGbHour;
}
