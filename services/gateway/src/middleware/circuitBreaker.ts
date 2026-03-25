import { Request, Response, NextFunction } from 'express';

// ── Circuit Breaker States ───────────────────────────────────────────
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitStatus {
  service: string;
  state: CircuitState;
  failures: number;
  lastFailure: Date | null;
}

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  lastFailure: Date | null;
  nextRetryAt: Date | null;
}

// ── Configuration ────────────────────────────────────────────────────
const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 60_000; // 60s
const HALF_OPEN_DELAY_MS = 30_000; // 30s

/**
 * Per-service circuit breaker.
 *
 * - **closed**    – requests flow normally; failures are counted.
 * - **open**      – all requests are immediately rejected with 503.
 * - **half-open** – a single probe request is allowed through; success
 *                   resets the circuit, failure re-opens it.
 */
export class CircuitBreaker {
  private circuits: Map<string, CircuitEntry> = new Map();

  // ── helpers ──────────────────────────────────────────────────────
  private getOrCreate(service: string): CircuitEntry {
    if (!this.circuits.has(service)) {
      this.circuits.set(service, {
        state: 'closed',
        failures: 0,
        lastFailure: null,
        nextRetryAt: null,
      });
    }
    return this.circuits.get(service)!;
  }

  // ── public API ───────────────────────────────────────────────────
  getStatus(service: string): CircuitStatus {
    const entry = this.getOrCreate(service);

    // If open and past the retry window, transition to half-open
    if (
      entry.state === 'open' &&
      entry.nextRetryAt &&
      new Date() >= entry.nextRetryAt
    ) {
      entry.state = 'half-open';
    }

    return {
      service,
      state: entry.state,
      failures: entry.failures,
      lastFailure: entry.lastFailure,
    };
  }

  recordSuccess(service: string): void {
    const entry = this.getOrCreate(service);
    entry.failures = 0;
    entry.state = 'closed';
    entry.lastFailure = null;
    entry.nextRetryAt = null;
  }

  recordFailure(service: string): void {
    const entry = this.getOrCreate(service);
    const now = new Date();

    // Reset counter if last failure was outside the rolling window
    if (
      entry.lastFailure &&
      now.getTime() - entry.lastFailure.getTime() > FAILURE_WINDOW_MS
    ) {
      entry.failures = 0;
    }

    entry.failures += 1;
    entry.lastFailure = now;

    if (entry.failures >= FAILURE_THRESHOLD) {
      entry.state = 'open';
      entry.nextRetryAt = new Date(now.getTime() + HALF_OPEN_DELAY_MS);
    }
  }

  isOpen(service: string): boolean {
    const status = this.getStatus(service);
    return status.state === 'open';
  }

  isHalfOpen(service: string): boolean {
    const status = this.getStatus(service);
    return status.state === 'half-open';
  }

  reset(service: string): void {
    this.circuits.delete(service);
  }

  resetAll(): void {
    this.circuits.clear();
  }

  getAllStatuses(): CircuitStatus[] {
    // Touch every circuit to trigger state transitions
    return [...this.circuits.keys()].map((s) => this.getStatus(s));
  }
}

// ── Singleton used across the gateway ────────────────────────────────
export const circuitBreaker = new CircuitBreaker();

/**
 * Express middleware factory.
 * Wraps upstream proxy calls with circuit-breaker protection.
 */
export function circuitBreakerMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (circuitBreaker.isOpen(serviceName)) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: `Circuit breaker is open for "${serviceName}". Try again later.`,
      });
      return;
    }

    // Intercept the response to record success / failure
    const originalEnd = res.end.bind(res);
    res.end = function (...args: Parameters<Response['end']>) {
      if (res.statusCode >= 500) {
        circuitBreaker.recordFailure(serviceName);
      } else {
        circuitBreaker.recordSuccess(serviceName);
      }
      return originalEnd(...args);
    } as Response['end'];

    next();
  };
}
