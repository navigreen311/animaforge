/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
}

export interface CreditAccount {
  balance: number;
  concurrentJobs: number;
}

/* ------------------------------------------------------------------ */
/*  Rate limiter (in-memory sliding window)                            */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRequests: 10,
  windowMs: 60_000, // 1 minute
};

const MAX_CONCURRENT_JOBS = 3;

export class RateLimiter {
  private config: RateLimiterConfig;
  private requests: Map<string, number[]> = new Map();

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check whether a request from the given key should be allowed.
   * If allowed, the request is recorded in the sliding window.
   */
  check(key: string): ValidationResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing timestamps and prune expired entries
    const timestamps = (this.requests.get(key) || []).filter(
      (t) => t > windowStart,
    );

    if (timestamps.length >= this.config.maxRequests) {
      const oldestInWindow = timestamps[0]!;
      const retryAfterMs = oldestInWindow + this.config.windowMs - now;

      return {
        allowed: false,
        reason: `Rate limit exceeded. Max ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s.`,
        retryAfterMs: Math.max(retryAfterMs, 0),
      };
    }

    // Record the request
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return { allowed: true };
  }

  /**
   * Return the number of remaining requests for a key within the current window.
   */
  remaining(key: string): number {
    const windowStart = Date.now() - this.config.windowMs;
    const timestamps = (this.requests.get(key) || []).filter(
      (t) => t > windowStart,
    );
    return Math.max(this.config.maxRequests - timestamps.length, 0);
  }

  /**
   * Reset all tracked state (useful for testing).
   */
  reset(): void {
    this.requests.clear();
  }
}

/* ------------------------------------------------------------------ */
/*  In-memory credit & job stores                                      */
/* ------------------------------------------------------------------ */

const creditAccounts: Map<string, CreditAccount> = new Map();

function getOrCreateAccount(userId: string): CreditAccount {
  let account = creditAccounts.get(userId);
  if (!account) {
    account = { balance: 100, concurrentJobs: 0 };
    creditAccounts.set(userId, account);
  }
  return account;
}

/* ------------------------------------------------------------------ */
/*  Global rate limiter instance                                       */
/* ------------------------------------------------------------------ */

const globalLimiter = new RateLimiter();

/* ------------------------------------------------------------------ */
/*  Generation request validation                                      */
/* ------------------------------------------------------------------ */

/**
 * Validate a generation request against three gates:
 *
 * 1. **Rate limit** — sliding-window check (default 10 req/min)
 * 2. **Credit balance** — user must have enough credits for the job
 * 3. **Concurrent job limit** — max 3 active generation jobs per user
 *
 * Returns `{ allowed: true }` when all checks pass, or
 * `{ allowed: false, reason }` with a human-readable explanation.
 */
export function validateGenerationRequest(
  userId: string,
  creditCost: number,
): ValidationResult {
  // Gate 1: Rate limit
  const rateResult = globalLimiter.check(userId);
  if (!rateResult.allowed) {
    return rateResult;
  }

  // Gate 2: Credit balance
  const account = getOrCreateAccount(userId);
  if (account.balance < creditCost) {
    return {
      allowed: false,
      reason: `Insufficient credits. Required: ${creditCost}, available: ${account.balance}.`,
    };
  }

  // Gate 3: Concurrent job limit
  if (account.concurrentJobs >= MAX_CONCURRENT_JOBS) {
    return {
      allowed: false,
      reason: `Concurrent job limit reached (max ${MAX_CONCURRENT_JOBS}). Wait for a running job to finish.`,
    };
  }

  // All checks passed — debit credits and increment concurrent jobs
  account.balance -= creditCost;
  account.concurrentJobs += 1;

  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/*  Credit refund                                                      */
/* ------------------------------------------------------------------ */

/**
 * Refund credits to a user (e.g. after a failed generation).
 * Also decrements the concurrent job counter.
 */
export function refundCredits(
  userId: string,
  creditCost: number,
  reason: string,
): void {
  const account = getOrCreateAccount(userId);
  account.balance += creditCost;
  account.concurrentJobs = Math.max(account.concurrentJobs - 1, 0);

  // Log the refund for auditability
  console.info(
    `[credit-refund] userId=${userId} amount=${creditCost} reason="${reason}" newBalance=${account.balance}`,
  );
}

/**
 * Mark a job as complete (decrement concurrent job counter without refund).
 */
export function completeJob(userId: string): void {
  const account = getOrCreateAccount(userId);
  account.concurrentJobs = Math.max(account.concurrentJobs - 1, 0);
}

/**
 * Get the current credit balance and concurrent job count for a user.
 * Useful for UI display.
 */
export function getAccountInfo(userId: string): CreditAccount {
  return { ...getOrCreateAccount(userId) };
}
