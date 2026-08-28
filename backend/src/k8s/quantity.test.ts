import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cpuToMillicores, formatCpu, formatMemory, memoryToBytes, parseQuantity } from "./quantity.js";

describe("parseQuantity", () => {
  it("parses plain integers and decimals", () => {
    assert.equal(parseQuantity("1"), 1);
    assert.equal(parseQuantity("0.5"), 0.5);
  });

  it("parses binary SI suffixes", () => {
    assert.equal(parseQuantity("1Ki"), 1024);
    assert.equal(parseQuantity("128Mi"), 134217728);
    assert.equal(parseQuantity("1Gi"), 1073741824);
  });

  it("parses decimal SI suffixes", () => {
    assert.equal(parseQuantity("1k"), 1000);
    assert.equal(parseQuantity("1M"), 1e6);
    assert.equal(parseQuantity("250m"), 0.25);
  });

  it("parses exponent notation", () => {
    assert.equal(parseQuantity("129e6"), 129e6);
  });

  it("throws rather than guessing on an unknown suffix", () => {
    assert.throws(() => parseQuantity("100Q"), /Unknown Kubernetes quantity suffix/);
    assert.throws(() => parseQuantity("abc"), /Unparseable/);
  });
});

describe("cpuToMillicores", () => {
  it("converts pod-spec CPU requests", () => {
    assert.equal(cpuToMillicores("250m"), 250);
    assert.equal(cpuToMillicores("1"), 1000);
    assert.equal(cpuToMillicores("1500m"), 1500);
  });

  // metrics-server reports nanocores; treating "n" as anything else would put
  // the cost figure off by nine orders of magnitude.
  it("converts metrics-server nanocore readings", () => {
    assert.equal(cpuToMillicores("1500000n"), 1.5);
    assert.equal(cpuToMillicores("250000000n"), 250);
  });

  it("converts microcore readings", () => {
    assert.equal(cpuToMillicores("1000u"), 1);
  });
});

describe("memoryToBytes", () => {
  it("converts pod-spec and metrics-server memory units", () => {
    assert.equal(memoryToBytes("128Mi"), 134217728);
    assert.equal(memoryToBytes("187392Ki"), 187392 * 1024);
  });
});

describe("formatting", () => {
  it("formats CPU for display", () => {
    assert.equal(formatCpu(250), "250.0m");
    assert.equal(formatCpu(1500), "1.50 cores");
  });

  it("formats memory for display", () => {
    assert.equal(formatMemory(134217728), "128.0Mi");
    assert.equal(formatMemory(1073741824), "1.00Gi");
  });
});
