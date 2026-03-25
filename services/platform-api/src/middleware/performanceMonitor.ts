import type { Request, Response, NextFunction, Router } from "express";
import { Router as ExpressRouter } from "express";

interface EndpointStats {
  hits: number;
  totalMs: number;
  maxMs: number;
  minMs: number;
  slowRequests: number;
}

const stats = new Map<string, EndpointStats>();
const SLOW_THRESHOLD_MS = 500;

export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = durationNs / 1_000_000;

    try {
      if (!res.headersSent) {
        res.setHeader("Server-Timing", `total;dur=${durationMs.toFixed(2)}`);
      }
    } catch {
      // headers already sent
    }

    const key = `${req.method} ${req.route?.path ?? req.path}`;
    const existing = stats.get(key);
    if (existing) {
      existing.hits += 1;
      existing.totalMs += durationMs;
      existing.maxMs = Math.max(existing.maxMs, durationMs);
      existing.minMs = Math.min(existing.minMs, durationMs);
      if (durationMs > SLOW_THRESHOLD_MS) existing.slowRequests += 1;
    } else {
      stats.set(key, {
        hits: 1,
        totalMs: durationMs,
        maxMs: durationMs,
        minMs: durationMs,
        slowRequests: durationMs > SLOW_THRESHOLD_MS ? 1 : 0,
      });
    }

    if (durationMs > SLOW_THRESHOLD_MS) {
      console.warn(`[perf] Slow request: ${key} took ${durationMs.toFixed(2)}ms`);
    }
  });

  next();
}

export function metricsRouter(): Router {
  const router = ExpressRouter();

  router.get("/metrics", (_req: Request, res: Response) => {
    const endpoints: Record<string, any> = {};
    for (const [key, s] of stats.entries()) {
      endpoints[key] = {
        hits: s.hits,
        avgMs: s.hits > 0 ? Math.round((s.totalMs / s.hits) * 100) / 100 : 0,
        maxMs: Math.round(s.maxMs * 100) / 100,
        minMs: Math.round(s.minMs * 100) / 100,
        slowRequests: s.slowRequests,
      };
    }
    const totalHits = Array.from(stats.values()).reduce((sum, s) => sum + s.hits, 0);
    const totalSlowRequests = Array.from(stats.values()).reduce((sum, s) => sum + s.slowRequests, 0);

    res.json({
      success: true,
      data: {
        uptime: process.uptime(),
        totalRequests: totalHits,
        totalSlowRequests,
        slowThresholdMs: SLOW_THRESHOLD_MS,
        endpoints,
      },
    });
  });

  return router;
}

export function resetStats(): void {
  stats.clear();
}
