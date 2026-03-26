import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

// ── Types ───────────────────────────────────────────────────────────
export interface Snapshot {
  snapshotId: string;
  jobId: string;
  modelId: string;
  inputHash: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  parentSnapshotId?: string;
}

export interface SnapshotDiff {
  differences: { key: string; valueA: unknown; valueB: unknown }[];
  identical: boolean;
}

export interface ReplayResult {
  newJobId: string;
  snapshotId: string;
  originalSnapshotId: string;
  parameters: Record<string, unknown>;
  timestamp: string;
}

// ── In-memory store ─────────────────────────────────────────────────
const snapshots = new Map<string, Snapshot>();

export const reproducibilityService = {
  /**
   * Compute a SHA-256 hash of serialized input parameters.
   */
  computeInputHash(params: Record<string, unknown>): string {
    const serialized = JSON.stringify(params, Object.keys(params).sort());
    return createHash("sha256").update(serialized).digest("hex");
  },

  /**
   * Capture a parameter snapshot for a generation job.
   */
  async captureSnapshot(
    jobId: string,
    params: Record<string, unknown>,
    parentSnapshotId?: string,
  ): Promise<Snapshot> {
    const modelId = (params.modelId as string) ?? "unknown";
    const inputHash = reproducibilityService.computeInputHash(params);

    const snapshot: Snapshot = {
      snapshotId: uuidv4(),
      jobId,
      modelId,
      inputHash,
      parameters: { ...params },
      timestamp: new Date().toISOString(),
      parentSnapshotId,
    };
    snapshots.set(snapshot.snapshotId, snapshot);
    return snapshot;
  },

  /**
   * Retrieve a full parameter snapshot by ID.
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    return snapshots.get(snapshotId);
  },

  /**
   * Replay a generation using the exact parameters from a previous snapshot.
   * Creates a new job and a new snapshot linked to the original.
   */
  async replayGeneration(snapshotId: string): Promise<ReplayResult | undefined> {
    const original = snapshots.get(snapshotId);
    if (!original) return undefined;

    const newJobId = uuidv4();
    const newSnapshot = await reproducibilityService.captureSnapshot(
      newJobId,
      original.parameters,
      snapshotId,
    );

    return {
      newJobId,
      snapshotId: newSnapshot.snapshotId,
      originalSnapshotId: snapshotId,
      parameters: original.parameters,
      timestamp: newSnapshot.timestamp,
    };
  },

  /**
   * Compare two snapshots and report the differences.
   */
  async compareSnapshots(
    snapshotIdA: string,
    snapshotIdB: string,
  ): Promise<SnapshotDiff | undefined> {
    const a = snapshots.get(snapshotIdA);
    const b = snapshots.get(snapshotIdB);
    if (!a || !b) return undefined;

    const allKeys = new Set([
      ...Object.keys(a.parameters),
      ...Object.keys(b.parameters),
    ]);

    const differences: { key: string; valueA: unknown; valueB: unknown }[] = [];

    for (const key of allKeys) {
      const valA = a.parameters[key];
      const valB = b.parameters[key];
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        differences.push({ key, valueA: valA, valueB: valB });
      }
    }

    return {
      differences,
      identical: differences.length === 0,
    };
  },

  /**
   * Get the full lineage chain of re-generations from an original job.
   * Walks parentSnapshotId links to build the chain.
   */
  async getJobLineage(jobId: string): Promise<Snapshot[]> {
    // Find all snapshots for this job
    const jobSnapshots = Array.from(snapshots.values()).filter(
      (s) => s.jobId === jobId,
    );

    if (jobSnapshots.length === 0) return [];

    // Start from the target job's snapshot, then walk backward to root and forward to leaves
    const allSnapshots = Array.from(snapshots.values());
    const lineage: Snapshot[] = [];
    const visited = new Set<string>();

    // Find root by walking parentSnapshotId backward from first match
    let current: Snapshot | undefined = jobSnapshots[0];
    const backtrack: Snapshot[] = [];
    while (current) {
      if (visited.has(current.snapshotId)) break;
      visited.add(current.snapshotId);
      backtrack.unshift(current);
      current = current.parentSnapshotId
        ? snapshots.get(current.parentSnapshotId)
        : undefined;
    }

    lineage.push(...backtrack);

    // Walk forward from root: find children of each snapshot
    const queue = [lineage[0]?.snapshotId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = allSnapshots.filter(
        (s) => s.parentSnapshotId === parentId && !visited.has(s.snapshotId),
      );
      for (const child of children) {
        visited.add(child.snapshotId);
        lineage.push(child);
        queue.push(child.snapshotId);
      }
    }

    return lineage.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  /** Clears all data -- for testing only. */
  _clear(): void {
    snapshots.clear();
  },
};
