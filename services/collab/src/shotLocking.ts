const LOCK_EXPIRY_MS = 30_000;

export interface LockInfo { locked: boolean; lockedBy: string | null; expiresAt: number | null; }
interface InternalLock { userId: string; shotId: string; expiresAt: number; timer: NodeJS.Timeout; }

export class ShotLockManager {
  private locks = new Map<string, InternalLock>();
  onLockExpired?: (shotId: string, userId: string) => void;

  lockShot(userId: string, shotId: string): LockInfo {
    const ex = this.locks.get(shotId);
    if (ex && ex.userId !== userId && ex.expiresAt > Date.now()) return { locked: true, lockedBy: ex.userId, expiresAt: ex.expiresAt };
    if (ex) clearTimeout(ex.timer);
    const expiresAt = Date.now() + LOCK_EXPIRY_MS;
    const timer = setTimeout(() => { this.locks.delete(shotId); this.onLockExpired?.(shotId, userId); }, LOCK_EXPIRY_MS);
    this.locks.set(shotId, { userId, shotId, expiresAt, timer });
    return { locked: true, lockedBy: userId, expiresAt };
  }

  unlockShot(userId: string, shotId: string): boolean {
    const ex = this.locks.get(shotId);
    if (!ex || ex.userId !== userId) return false;
    clearTimeout(ex.timer); this.locks.delete(shotId); return true;
  }

  isLocked(shotId: string): LockInfo {
    const ex = this.locks.get(shotId);
    if (!ex || ex.expiresAt <= Date.now()) { if (ex) { clearTimeout(ex.timer); this.locks.delete(shotId); } return { locked: false, lockedBy: null, expiresAt: null }; }
    return { locked: true, lockedBy: ex.userId, expiresAt: ex.expiresAt };
  }

  releaseAllForUser(userId: string): string[] {
    const released: string[] = [];
    for (const [sid, lk] of this.locks.entries()) { if (lk.userId === userId) { clearTimeout(lk.timer); this.locks.delete(sid); released.push(sid); } }
    return released;
  }

  getAllLocks(): Map<string, LockInfo> {
    const r = new Map<string, LockInfo>();
    for (const [sid, lk] of this.locks.entries()) { if (lk.expiresAt > Date.now()) r.set(sid, { locked: true, lockedBy: lk.userId, expiresAt: lk.expiresAt }); }
    return r;
  }
}
