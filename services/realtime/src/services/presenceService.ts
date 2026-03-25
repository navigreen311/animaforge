/**
 * In-memory presence tracker.
 *
 * Tracks user status (online / away / busy / offline), supports
 * auto-away timers, and exposes session history for diagnostics.
 */

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface PresenceEntry {
  userId: string;
  status: PresenceStatus;
  projectId?: string;
  lastSeen: Date;
  connectedAt: Date;
}

export interface PresenceHistoryRecord {
  userId: string;
  sessionDuration: number; // milliseconds
  lastSeen: Date;
  connectedAt: Date;
}

// ── Service ──────────────────────────────────────────────────────────
class PresenceService {
  /** userId → current presence */
  private presence: Map<string, PresenceEntry> = new Map();
  /** userId → auto-away timer handle */
  private awayTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** userId → past sessions (capped ring buffer) */
  private history: Map<string, PresenceHistoryRecord[]> = new Map();
  private readonly MAX_HISTORY = 50;

  // ── Core operations ────────────────────────────────────────────
  trackPresence(userId: string, status: PresenceStatus, projectId?: string): PresenceEntry {
    const existing = this.presence.get(userId);
    const now = new Date();

    const entry: PresenceEntry = {
      userId,
      status,
      projectId: projectId ?? existing?.projectId,
      lastSeen: now,
      connectedAt: existing?.connectedAt ?? now,
    };

    // If transitioning to offline, archive the session
    if (status === "offline" && existing && existing.status !== "offline") {
      this.archiveSession(existing);
    }

    this.presence.set(userId, entry);
    this.clearAwayTimer(userId);

    return entry;
  }

  getPresence(userId: string): PresenceEntry | undefined {
    return this.presence.get(userId);
  }

  getOnlineUsers(projectId?: string): PresenceEntry[] {
    const all = [...this.presence.values()].filter(
      (e) => e.status !== "offline",
    );
    if (projectId) {
      return all.filter((e) => e.projectId === projectId);
    }
    return all;
  }

  // ── Auto-away ──────────────────────────────────────────────────
  setAway(userId: string, timeoutMs: number): void {
    this.clearAwayTimer(userId);

    const timer = setTimeout(() => {
      const entry = this.presence.get(userId);
      if (entry && entry.status === "online") {
        entry.status = "away";
        entry.lastSeen = new Date();
      }
      this.awayTimers.delete(userId);
    }, timeoutMs);

    this.awayTimers.set(userId, timer);
  }

  // ── History ────────────────────────────────────────────────────
  getPresenceHistory(userId: string): PresenceHistoryRecord[] {
    return this.history.get(userId) ?? [];
  }

  // ── Internals ──────────────────────────────────────────────────
  private archiveSession(entry: PresenceEntry): void {
    const record: PresenceHistoryRecord = {
      userId: entry.userId,
      sessionDuration: Date.now() - entry.connectedAt.getTime(),
      lastSeen: new Date(),
      connectedAt: entry.connectedAt,
    };

    if (!this.history.has(entry.userId)) {
      this.history.set(entry.userId, []);
    }

    const list = this.history.get(entry.userId)!;
    list.push(record);
    if (list.length > this.MAX_HISTORY) {
      list.shift();
    }
  }

  private clearAwayTimer(userId: string): void {
    const existing = this.awayTimers.get(userId);
    if (existing) {
      clearTimeout(existing);
      this.awayTimers.delete(userId);
    }
  }

  /** Tear down all timers (for graceful shutdown / tests). */
  dispose(): void {
    for (const timer of this.awayTimers.values()) {
      clearTimeout(timer);
    }
    this.awayTimers.clear();
  }
}

// ── Singleton ────────────────────────────────────────────────────────
export const presenceService = new PresenceService();
