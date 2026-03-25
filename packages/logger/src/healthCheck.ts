import type { Request, Response } from 'express';

export interface CheckResult {
  status: 'ok' | 'degraded' | 'down';
  latency_ms: number;
}

export type HealthCheckFn = () => Promise<CheckResult>;

export interface HealthCheckOptions {
  version?: string;
  checks?: Record<string, HealthCheckFn>;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  checks: Record<string, CheckResult>;
}

export function healthCheck(options: HealthCheckOptions = {}) {
  const { version = process.env.APP_VERSION || '0.0.0', checks = {} } = options;

  return async (_req: Request, res: Response): Promise<void> => {
    const results: Record<string, CheckResult> = {};
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
    const checkEntries = Object.entries(checks);

    const settled = await Promise.allSettled(
      checkEntries.map(async ([name, checkFn]) => {
        const start = Date.now();
        try {
          const result = await checkFn();
          return { name, result };
        } catch {
          return { name, result: { status: 'down' as const, latency_ms: Date.now() - start } };
        }
      }),
    );

    for (const entry of settled) {
      if (entry.status === 'fulfilled') {
        const { name, result } = entry.value;
        results[name] = result;
        if (result.status === 'down') { overallStatus = 'down'; }
        else if (result.status === 'degraded' && overallStatus !== 'down') { overallStatus = 'degraded'; }
      }
    }

    const response: HealthResponse = { status: overallStatus, version, uptime: process.uptime(), checks: results };
    const statusCode = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(statusCode).json(response);
  };
}
