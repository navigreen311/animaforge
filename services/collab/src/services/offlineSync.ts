import { conflictResolver, type ConflictData } from './conflictResolver.js';

export interface OfflineEdit {
  id: string;
  userId: string;
  projectId: string;
  action: string;
  payload: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

export interface SyncResult {
  applied: number;
  conflicts: number;
  failed: number;
  edits: OfflineEdit[];
}

let editCounter = 0;
function generateEditId(): string {
  editCounter++;
  return `oe_${Date.now()}_${editCounter}`;
}

/**
 * Manages offline edit queuing, synchronization, and conflict handling.
 * Edits are stored in memory keyed by `userId:projectId`.
 */
export class OfflineSyncService {
  private pendingEdits = new Map<string, OfflineEdit[]>();

  private key(userId: string, projectId: string): string {
    return `${userId}:${projectId}`;
  }

  /**
   * Queue an edit made while offline for later sync.
   */
  queueOfflineEdit(
    userId: string,
    projectId: string,
    edit: { action: string; payload: Record<string, unknown> },
  ): OfflineEdit {
    const k = this.key(userId, projectId);
    if (!this.pendingEdits.has(k)) {
      this.pendingEdits.set(k, []);
    }

    const entry: OfflineEdit = {
      id: generateEditId(),
      userId,
      projectId,
      action: edit.action,
      payload: edit.payload,
      timestamp: Date.now(),
      synced: false,
    };

    this.pendingEdits.get(k)!.push(entry);
    return entry;
  }

  /**
   * Apply all queued edits for a user+project when back online.
   * Returns summary of applied, conflicted, and failed edits.
   */
  syncOfflineEdits(userId: string, projectId: string): SyncResult {
    const k = this.key(userId, projectId);
    const edits = this.pendingEdits.get(k) ?? [];
    const unsynced = edits.filter((e) => !e.synced);

    let applied = 0;
    let conflicts = 0;
    let failed = 0;

    for (const edit of unsynced) {
      try {
        // Mark as synced; real implementation would apply to Yjs doc
        edit.synced = true;
        applied++;
      } catch {
        failed++;
      }
    }

    // Clean up synced edits
    this.pendingEdits.set(
      k,
      edits.filter((e) => !e.synced),
    );

    return { applied, conflicts, failed, edits: unsynced };
  }

  /**
   * Get all pending (unsynced) edits for a user across all projects.
   */
  getPendingEdits(userId: string): OfflineEdit[] {
    const result: OfflineEdit[] = [];
    for (const [k, edits] of this.pendingEdits) {
      if (k.startsWith(`${userId}:`)) {
        result.push(...edits.filter((e) => !e.synced));
      }
    }
    return result;
  }

  /**
   * Resolve conflicts that arose from offline edits.
   * Compares offline edits against current state timestamps.
   */
  resolveOfflineConflicts(
    userId: string,
    projectId: string,
    currentTimestamp: number = Date.now(),
  ): { resolved: number; resolutions: Array<{ editId: string; strategy: string }> } {
    const k = this.key(userId, projectId);
    const edits = this.pendingEdits.get(k) ?? [];
    const unsynced = edits.filter((e) => !e.synced);
    const resolutions: Array<{ editId: string; strategy: string }> = [];

    for (const edit of unsynced) {
      const conflict: ConflictData = {
        docId: projectId,
        field: edit.action,
        localValue: edit.payload,
        remoteValue: null,
        localTimestamp: edit.timestamp,
        remoteTimestamp: currentTimestamp,
        localClientId: hashUserId(userId),
        remoteClientId: 0,
      };

      const resolution = conflictResolver.resolveConflict(projectId, conflict);
      edit.synced = true;
      resolutions.push({ editId: edit.id, strategy: resolution.strategy });
    }

    // Clean up resolved edits
    this.pendingEdits.set(
      k,
      edits.filter((e) => !e.synced),
    );

    return { resolved: resolutions.length, resolutions };
  }
}

/** Simple hash to derive a numeric clientId from userId string */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const offlineSyncService = new OfflineSyncService();
