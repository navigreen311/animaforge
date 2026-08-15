import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineSyncService } from '../../services/collab/src/services/offlineSync';

describe('OfflineSyncService conflict detection', () => {
  let service: OfflineSyncService;

  beforeEach(() => {
    service = new OfflineSyncService();
  });

  it('applies independent edits with no conflicts', () => {
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'Opening' },
    });
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.duration',
      payload: { value: 12 },
    });

    const result = service.syncOfflineEdits('user-1', 'proj-1');

    expect(result.applied).toBe(2);
    expect(result.conflicts).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('counts a superseded edit to the same field as a conflict', () => {
    // Both were made offline, so neither saw the other: concurrent by
    // definition, and only the later one can win.
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'First' },
    });
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'Second' },
    });

    const result = service.syncOfflineEdits('user-1', 'proj-1');

    // Previously this returned conflicts: 0 unconditionally, reporting a clean
    // sync while one edit silently clobbered the other.
    expect(result.conflicts).toBe(1);
    expect(result.applied).toBe(1);
    expect(result.applied + result.conflicts).toBe(2);
  });

  it('keeps the latest edit as the winner regardless of queue order', () => {
    const older = service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'Older' },
    });
    const newer = service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'Newer' },
    });

    // Force a deterministic ordering rather than relying on clock resolution.
    older.timestamp = 2_000;
    newer.timestamp = 1_000;

    const result = service.syncOfflineEdits('user-1', 'proj-1');

    expect(result.applied).toBe(1);
    expect(result.conflicts).toBe(1);
  });

  it('reports conflicts per field, not per edit batch', () => {
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'A' },
    });
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'B' },
    });
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'C' },
    });
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.duration',
      payload: { value: 5 },
    });

    const result = service.syncOfflineEdits('user-1', 'proj-1');

    // 3 title edits -> 1 winner + 2 conflicts; duration is untouched.
    expect(result.applied).toBe(2);
    expect(result.conflicts).toBe(2);
  });

  it('clears the queue after syncing', () => {
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'A' },
    });
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'B' },
    });

    service.syncOfflineEdits('user-1', 'proj-1');

    expect(service.getPendingEdits('user-1')).toHaveLength(0);
  });

  it('does not mix edits from different projects', () => {
    service.queueOfflineEdit('user-1', 'proj-1', {
      action: 'shot.title',
      payload: { value: 'A' },
    });
    service.queueOfflineEdit('user-1', 'proj-2', {
      action: 'shot.title',
      payload: { value: 'B' },
    });

    const result = service.syncOfflineEdits('user-1', 'proj-1');

    expect(result.applied).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(service.getPendingEdits('user-1')).toHaveLength(1);
  });

  it('returns an empty result for a user with nothing queued', () => {
    const result = service.syncOfflineEdits('nobody', 'proj-1');

    expect(result).toMatchObject({ applied: 0, conflicts: 0, failed: 0 });
    expect(result.edits).toEqual([]);
  });
});
