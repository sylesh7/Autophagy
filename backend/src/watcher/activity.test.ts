import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attemptsPerTask, parseActivity } from "./activity.js";

describe("parseActivity", () => {
  it("counts attempts and distinct completions", () => {
    const activity = parseActivity(
      [
        "AUTOPHAGY attempt task=ledger-sync-1",
        "AUTOPHAGY complete task=ledger-sync-1",
        "AUTOPHAGY attempt task=ledger-sync-2",
        "AUTOPHAGY complete task=ledger-sync-2",
      ].join("\n"),
    );

    assert.equal(activity.attempts, 2);
    assert.equal(activity.completions, 2);
    assert.deepEqual(activity.unfinishedTaskIds, []);
    assert.equal(activity.linesParsed, 4);
  });

  it("identifies tasks attempted but never completed", () => {
    const activity = parseActivity(
      [
        "AUTOPHAGY attempt task=settlement-4417",
        "attempt failed, backing off before retry",
        "AUTOPHAGY attempt task=settlement-4417",
        "AUTOPHAGY attempt task=settlement-4417",
      ].join("\n"),
    );

    assert.equal(activity.attempts, 3);
    assert.equal(activity.completions, 0);
    assert.deepEqual(activity.unfinishedTaskIds, ["settlement-4417"]);
  });

  it("ignores ordinary log output the agent emits", () => {
    const activity = parseActivity(
      ["agent-runtime v1.4.2 ready", "connecting to broker", "heartbeat ok"].join("\n"),
    );

    assert.equal(activity.attempts, 0);
    assert.equal(activity.linesParsed, 0);
    assert.deepEqual(activity.unfinishedTaskIds, []);
  });

  it("does not count a completed task as unfinished on later re-attempt", () => {
    const activity = parseActivity(
      [
        "AUTOPHAGY attempt task=a",
        "AUTOPHAGY complete task=a",
        "AUTOPHAGY attempt task=a",
      ].join("\n"),
    );

    assert.equal(activity.attempts, 2);
    assert.deepEqual(activity.unfinishedTaskIds, []);
  });
});

describe("attemptsPerTask", () => {
  it("ranks task IDs by attempt count", () => {
    const activity = parseActivity(
      [
        "AUTOPHAGY attempt task=a",
        "AUTOPHAGY attempt task=b",
        "AUTOPHAGY attempt task=b",
        "AUTOPHAGY attempt task=b",
      ].join("\n"),
    );

    const ranked = attemptsPerTask(activity);
    assert.equal(ranked[0]?.taskId, "b");
    assert.equal(ranked[0]?.attempts, 3);
    assert.equal(ranked[1]?.attempts, 1);
  });
});
