import type { LockInfo } from '../shotLocking.js';

export type CollabRole = 'view' | 'edit' | 'admin';

export interface CollabUser {
  userId: string;
  displayName: string;
  role: CollabRole;
  joinedAt: number;
}

export interface CollabSession {
  projectId: string;
  users: Map<string, CollabUser>;
  editHistory: EditEntry[];
  createdAt: number;
  lastActivity: number;
}

export interface EditEntry {
  userId: string;
  action: string;
  timestamp: number;
  shotId: string | null;
}

export interface SessionDetails {
  projectId: string;
  users: CollabUser[];
  locks: Array<{ shotId: string } & LockInfo>;
  lastActivity: number;
  editCount: number;
}

export interface Invite {
  projectId: string;
  userId: string;
  role: CollabRole;
  invitedAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * In-memory collaboration session manager.
 * Tracks sessions, users, permissions, invites, and edit history.
 */
export class CollabService {
  private sessions = new Map<string, CollabSession>();
  private invites: Invite[] = [];

  getOrCreateSession(projectId: string): CollabSession {
    if (!this.sessions.has(projectId)) {
      this.sessions.set(projectId, {
        projectId,
        users: new Map(),
        editHistory: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });
    }
    return this.sessions.get(projectId)!;
  }

  getActiveSessions(): Array<{ projectId: string; userCount: number; lastActivity: number }> {
    const result: Array<{ projectId: string; userCount: number; lastActivity: number }> = [];
    for (const [projectId, session] of this.sessions) {
      result.push({
        projectId,
        userCount: session.users.size,
        lastActivity: session.lastActivity,
      });
    }
    return result;
  }

  getSessionDetails(
    projectId: string,
    lockProvider?: () => Map<string, LockInfo>,
  ): SessionDetails | null {
    const session = this.sessions.get(projectId);
    if (!session) return null;

    const locks: Array<{ shotId: string } & LockInfo> = [];
    if (lockProvider) {
      for (const [shotId, info] of lockProvider()) {
        locks.push({ shotId, ...info });
      }
    }

    return {
      projectId,
      users: Array.from(session.users.values()),
      locks,
      lastActivity: session.lastActivity,
      editCount: session.editHistory.length,
    };
  }

  addUser(projectId: string, userId: string, displayName: string, role: CollabRole = 'edit'): CollabUser {
    const session = this.getOrCreateSession(projectId);
    const user: CollabUser = { userId, displayName, role, joinedAt: Date.now() };
    session.users.set(userId, user);
    session.lastActivity = Date.now();
    return user;
  }

  removeUser(projectId: string, userId: string): boolean {
    const session = this.sessions.get(projectId);
    if (!session) return false;
    const removed = session.users.delete(userId);
    if (session.users.size === 0) {
      this.sessions.delete(projectId);
    }
    return removed;
  }

  inviteUser(projectId: string, userId: string, role: CollabRole = 'edit'): Invite {
    const invite: Invite = {
      projectId,
      userId,
      role,
      invitedAt: Date.now(),
      status: 'pending',
    };
    this.invites.push(invite);
    return invite;
  }

  getInvitesForUser(userId: string): Invite[] {
    return this.invites.filter((i) => i.userId === userId);
  }

  getEditHistory(projectId: string, limit = 50): EditEntry[] {
    const session = this.sessions.get(projectId);
    if (!session) return [];
    return session.editHistory.slice(-limit);
  }

  recordEdit(projectId: string, userId: string, action: string, shotId: string | null = null): EditEntry {
    const session = this.getOrCreateSession(projectId);
    const entry: EditEntry = { userId, action, timestamp: Date.now(), shotId };
    session.editHistory.push(entry);
    session.lastActivity = Date.now();
    return entry;
  }

  setPermission(projectId: string, userId: string, role: CollabRole): boolean {
    const session = this.sessions.get(projectId);
    if (!session) return false;
    const user = session.users.get(userId);
    if (!user) return false;
    user.role = role;
    return true;
  }

  kickUser(projectId: string, userId: string): boolean {
    return this.removeUser(projectId, userId);
  }

  /** Expose sessions map for testing */
  _getSessions(): Map<string, CollabSession> {
    return this.sessions;
  }
}

export const collabService = new CollabService();
