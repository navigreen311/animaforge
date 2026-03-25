/**
 * CRDT-style conflict resolution service.
 * Uses Yjs-inspired last-writer-wins with vector clock ordering.
 */

export interface ConflictData {
  docId: string;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  localClientId: number;
  remoteClientId: number;
}

export interface ConflictResolution {
  docId: string;
  field: string;
  resolvedValue: unknown;
  strategy: 'last-write-wins' | 'local-priority' | 'remote-priority' | 'merge';
  resolvedAt: number;
}

export interface MergeableState {
  clock: number;
  clientId: number;
  data: Record<string, unknown>;
  tombstones?: Set<string>;
}

export class ConflictResolver {
  private conflictLog: Map<string, ConflictResolution[]> = new Map();

  /**
   * Resolve a conflict between local and remote states using CRDT rules.
   * Default strategy: last-write-wins with clientId tiebreaker (higher ID wins).
   */
  resolveConflict(docId: string, conflict: ConflictData): ConflictResolution {
    let resolvedValue: unknown;
    let strategy: ConflictResolution['strategy'];

    if (conflict.localTimestamp !== conflict.remoteTimestamp) {
      // Last-write-wins: most recent timestamp takes priority
      strategy = 'last-write-wins';
      resolvedValue =
        conflict.localTimestamp > conflict.remoteTimestamp
          ? conflict.localValue
          : conflict.remoteValue;
    } else {
      // Timestamp tie: higher clientId wins (deterministic tiebreaker, Yjs convention)
      strategy = conflict.localClientId > conflict.remoteClientId
        ? 'local-priority'
        : 'remote-priority';
      resolvedValue =
        conflict.localClientId > conflict.remoteClientId
          ? conflict.localValue
          : conflict.remoteValue;
    }

    const resolution: ConflictResolution = {
      docId,
      field: conflict.field,
      resolvedValue,
      strategy,
      resolvedAt: Date.now(),
    };

    if (!this.conflictLog.has(docId)) {
      this.conflictLog.set(docId, []);
    }
    this.conflictLog.get(docId)!.push(resolution);
    return resolution;
  }

  /**
   * Yjs-style state merge: combine two states using vector clocks.
   * Fields present only in one state are kept. Overlapping fields
   * are resolved by clock then clientId.
   */
  mergeStates(stateA: MergeableState, stateB: MergeableState): MergeableState {
    const merged: Record<string, unknown> = {};
    const allKeys = new Set([
      ...Object.keys(stateA.data),
      ...Object.keys(stateB.data),
    ]);

    const tombstones = new Set<string>([
      ...(stateA.tombstones ?? []),
      ...(stateB.tombstones ?? []),
    ]);

    for (const key of allKeys) {
      if (tombstones.has(key)) continue;

      const inA = key in stateA.data;
      const inB = key in stateB.data;

      if (inA && !inB) {
        merged[key] = stateA.data[key];
      } else if (!inA && inB) {
        merged[key] = stateB.data[key];
      } else {
        // Both have the key: use clock then clientId as tiebreaker
        if (stateA.clock !== stateB.clock) {
          merged[key] = stateA.clock > stateB.clock
            ? stateA.data[key]
            : stateB.data[key];
        } else {
          merged[key] = stateA.clientId > stateB.clientId
            ? stateA.data[key]
            : stateB.data[key];
        }
      }
    }

    return {
      clock: Math.max(stateA.clock, stateB.clock) + 1,
      clientId: Math.max(stateA.clientId, stateB.clientId),
      data: merged,
      tombstones,
    };
  }

  getConflictLog(projectId: string): ConflictResolution[] {
    return this.conflictLog.get(projectId) ?? [];
  }

  clearLog(projectId: string): void {
    this.conflictLog.delete(projectId);
  }
}

export const conflictResolver = new ConflictResolver();
