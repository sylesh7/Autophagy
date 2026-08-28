/**
 * Parser for Kubernetes resource.Quantity strings.
 *
 * This matters more than it looks: metrics-server reports CPU in nanocores
 * ("1234567n") and memory in KiB ("187392Ki"), while pod specs use millicores
 * ("250m") and binary SI ("128Mi"). Getting a suffix wrong silently produces a
 * cost figure that is off by orders of magnitude, so both scales are handled
 * explicitly and anything unrecognised throws instead of guessing.
 *
 * Ref: https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/quantity/
 */

const DECIMAL_SUFFIX: Record<string, number> = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  "": 1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
};

const BINARY_SUFFIX: Record<string, number> = {
  Ki: 2 ** 10,
  Mi: 2 ** 20,
  Gi: 2 ** 30,
  Ti: 2 ** 40,
  Pi: 2 ** 50,
  Ei: 2 ** 60,
};

const QUANTITY_RE = /^([+-]?\d+(?:\.\d+)?)(?:([eE][+-]?\d+))?([a-zA-Z]{0,2})$/;

/** Parse a Quantity into its base unit (cores for CPU, bytes for memory). */
export function parseQuantity(raw: string): number {
  const value = raw.trim();
  const match = QUANTITY_RE.exec(value);
  if (!match) {
    throw new Error(`Unparseable Kubernetes quantity: "${raw}"`);
  }
  const [, mantissa, exponent, suffix = ""] = match;
  let base = Number(mantissa);
  if (Number.isNaN(base)) {
    throw new Error(`Unparseable Kubernetes quantity mantissa: "${raw}"`);
  }
  if (exponent) base *= 10 ** Number(exponent.slice(1));

  if (suffix in BINARY_SUFFIX) return base * BINARY_SUFFIX[suffix]!;
  if (suffix in DECIMAL_SUFFIX) return base * DECIMAL_SUFFIX[suffix]!;
  throw new Error(`Unknown Kubernetes quantity suffix "${suffix}" in "${raw}"`);
}

/** CPU quantity -> millicores. "250m" -> 250, "1" -> 1000, "1500000n" -> 1.5 */
export function cpuToMillicores(raw: string): number {
  return parseQuantity(raw) * 1000;
}

/** Memory quantity -> bytes. "128Mi" -> 134217728 */
export function memoryToBytes(raw: string): number {
  return parseQuantity(raw);
}

export function formatMemory(bytes: number): string {
  if (bytes >= 2 ** 30) return `${(bytes / 2 ** 30).toFixed(2)}Gi`;
  if (bytes >= 2 ** 20) return `${(bytes / 2 ** 20).toFixed(1)}Mi`;
  if (bytes >= 2 ** 10) return `${(bytes / 2 ** 10).toFixed(0)}Ki`;
  return `${bytes}B`;
}

export function formatCpu(milli: number): string {
  return milli >= 1000 ? `${(milli / 1000).toFixed(2)} cores` : `${milli.toFixed(1)}m`;
}
