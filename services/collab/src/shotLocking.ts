const LOCK_EXPIRY_MS = 30_000;

export interface LockInfo {
  locked: boolean;
  lockedBy: string | null;
  expiresAt: number | null;
}

interface InternalLock {
  userId: string;
  shotId: string;
  expiresAt: number;
  timer: NodeJS.Timeout;
}

export class ShotLockManager {
  private locks = new Map<string, InternalLock>();
  onLockExpired?: (shotId: string, userId: string) => void;

  lockShot(userId: string, shotId: string): LockInfo {
    const existing = this.locks.get(shotId);
    if (existing && existing.userId !== userId && existing.expiresAt > Date.now()) {
      return { locked: true, lockedBy: existing.userId, expiresAt: existing.expiresAt };
    }
    if (existing) clearTimeout(existing.timer);
    const expiresAt = Date.now() + LOCK_EXPIRY_MS;
    const timer = setTimeout(() => {
      this.locks.delete(shotId);
      this.onLockExpired?.(shotId, userId);
    }, LOCK_EXPIRY_MS);
    this.locks.set(shotId, { userId, shotId, expiresAt, timer });
    return { locked: true, lockedBy: userId, expiresAt };
  }

  unlockShot(userId: string, shotId: string): boolean {
    const existing = this.locks.get(shotId);
    if (!existing || existing.userId !== userId) return false;
    clearTimeout(existing.timer);
    this.locks.delete(shotId);
    return true;
  }

  isLocked(shotId: string): LockInfo {
    const existing = this.locks.get(shotId);
    if (!existing || existing.expiresAt <= Date.now()) {
      if (existing) { clearTimeout(existing.timer); this.locks.delete(shotId); }
      return { locked: false, lockedBy: null, expiresAt: null };
    }
    return { locked: true, lockedBy: existing.userId, expiresAt: existing.expiresAt };
  }

  releaseAllForUser(userId: string): string[] {
    const released: string[] = [];
    for (const [shotId, lock] of this.locks.entries()) {
      if (lock.userId === userId) {
        clearTimeout(lock.timer);
        this.locks.delete(shotId);
        released.push(shotId);
      }
    }
    return released;
  }

  getAllLocks(): Map<string, LockInfo> {
    const result = new Map<string, LockInfo>();
    for (const [shotId, lock] of this.locks.entries()) {
      if (lock.expiresAt > Date.now()) {
        result.set(shotId, { locked: true, lockedBy: lock.userId, expiresAt: lock.expiresAt });
      }
    }
    return result;
  }
}
