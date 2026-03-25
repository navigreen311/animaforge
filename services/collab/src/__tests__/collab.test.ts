import { describe, it, expect, beforeEach } from 'vitest';
import { CollabService } from '../services/collabService.js';
import { ConflictResolver } from '../services/conflictResolver.js';
import { OfflineSyncService } from '../services/offlineSync.js';

describe('CollabService', () => {
  let service: CollabService;

  beforeEach(() => {
    service = new CollabService();
  });

  it('should create and list active sessions', () => {
    service.addUser('proj-1', 'user-a', 'Alice');
    service.addUser('proj-2', 'user-b', 'Bob');

    const sessions = service.getActiveSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.find((s) => s.projectId === 'proj-1')?.userCount).toBe(1);
  });

  it('should invite a user and track the invite', () => {
    const invite = service.inviteUser('proj-1', 'user-b', 'edit');
    expect(invite.status).toBe('pending');
    expect(invite.role).toBe('edit');

    const invites = service.getInvitesForUser('user-b');
    expect(invites).toHaveLength(1);
    expect(invites[0].projectId).toBe('proj-1');
  });

  it('should record and retrieve edit history', () => {
    service.addUser('proj-1', 'user-a', 'Alice');
    service.recordEdit('proj-1', 'user-a', 'update-frame', 'shot-5');
    service.recordEdit('proj-1', 'user-a', 'add-layer', 'shot-5');

    const history = service.getEditHistory('proj-1');
    expect(history).toHaveLength(2);
    expect(history[0].action).toBe('update-frame');
    expect(history[1].shotId).toBe('shot-5');
  });

  it('should set user permissions', () => {
    service.addUser('proj-1', 'user-a', 'Alice', 'edit');
    const result = service.setPermission('proj-1', 'user-a', 'admin');
    expect(result).toBe(true);

    const details = service.getSessionDetails('proj-1');
    expect(details?.users[0].role).toBe('admin');
  });

  it('should kick a user from a session', () => {
    service.addUser('proj-1', 'user-a', 'Alice');
    service.addUser('proj-1', 'user-b', 'Bob');

    const kicked = service.kickUser('proj-1', 'user-a');
    expect(kicked).toBe(true);

    const details = service.getSessionDetails('proj-1');
    expect(details?.users).toHaveLength(1);
    expect(details?.users[0].userId).toBe('user-b');
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  it('should resolve conflicts using last-write-wins', () => {
    const resolution = resolver.resolveConflict('doc-1', {
      docId: 'doc-1',
      field: 'title',
      localValue: 'Local Title',
      remoteValue: 'Remote Title',
      localTimestamp: 1000,
      remoteTimestamp: 2000,
      localClientId: 1,
      remoteClientId: 2,
    });

    expect(resolution.strategy).toBe('last-write-wins');
    expect(resolution.resolvedValue).toBe('Remote Title');

    const log = resolver.getConflictLog('doc-1');
    expect(log).toHaveLength(1);
  });

  it('should merge two states with Yjs-style vector clocks', () => {
    const stateA = { clock: 3, clientId: 10, data: { title: 'A', color: 'red' } };
    const stateB = { clock: 5, clientId: 5, data: { title: 'B', size: 42 } };

    const merged = resolver.mergeStates(stateA, stateB);

    expect(merged.clock).toBe(6); // max(3,5) + 1
    expect(merged.data.title).toBe('B'); // stateB has higher clock
    expect(merged.data.color).toBe('red'); // only in A
    expect(merged.data.size).toBe(42); // only in B
  });
});

describe('OfflineSyncService', () => {
  let sync: OfflineSyncService;

  beforeEach(() => {
    sync = new OfflineSyncService();
  });

  it('should queue offline edits and sync them', () => {
    sync.queueOfflineEdit('user-a', 'proj-1', {
      action: 'update-frame',
      payload: { frameId: 'f1', data: 'new-data' },
    });
    sync.queueOfflineEdit('user-a', 'proj-1', {
      action: 'add-layer',
      payload: { layerId: 'l1' },
    });

    const pending = sync.getPendingEdits('user-a');
    expect(pending).toHaveLength(2);

    const result = sync.syncOfflineEdits('user-a', 'proj-1');
    expect(result.applied).toBe(2);
    expect(result.failed).toBe(0);

    const afterSync = sync.getPendingEdits('user-a');
    expect(afterSync).toHaveLength(0);
  });
});
