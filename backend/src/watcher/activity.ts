import type { AgentActivity } from "../types.js";

/**
 * Agents report their own work on stdout in a single line-oriented format.
 * Autophagy reads it back out of the real pod log via the Kubernetes API — it
 * is not injected, replayed, or synthesised anywhere.
 *
 *   AUTOPHAGY attempt task=<taskId>
 *   AUTOPHAGY complete task=<taskId>
 *
 * Anything else on stdout is ignored, so an agent is free to log normally.
 * This is the contract the demo workloads in k8s/workloads/ emit, and the same
 * contract any real agent would adopt to participate.
 */

const LINE_RE = /^\s*AUTOPHAGY\s+(attempt|complete)\s+task=(\S+)\s*$/;

export function parseActivity(rawLog: string): AgentActivity {
  const attempted: string[] = [];
  const completed = new Set<string>();
  let linesParsed = 0;

  for (const line of rawLog.split("\n")) {
    const match = LINE_RE.exec(line);
    if (!match) continue;
    linesParsed++;
    const [, verb, taskId] = match;
    if (verb === "attempt") attempted.push(taskId!);
    else completed.add(taskId!);
  }

  const unfinishedTaskIds = [...new Set(attempted)].filter((id) => !completed.has(id));

  return {
    attempts: attempted.length,
    completions: completed.size,
    taskIds: attempted,
    unfinishedTaskIds,
    linesParsed,
  };
}

/** How many times a single task ID was attempted, highest first. */
export function attemptsPerTask(activity: AgentActivity): Array<{ taskId: string; attempts: number }> {
  const counts = new Map<string, number>();
  for (const id of activity.taskIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([taskId, attempts]) => ({ taskId, attempts }))
    .sort((a, b) => b.attempts - a.attempts);
}
