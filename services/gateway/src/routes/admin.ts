import { Router, Request, Response } from 'express';
import { serviceRegistry } from '../services/serviceRegistry';
import { circuitBreaker } from '../middleware/circuitBreaker';

export const adminRouter = Router();

// ── GET /admin/services — list registered services with health ──────
adminRouter.get('/services', async (_req: Request, res: Response) => {
  try {
    // Refresh health before responding
    await serviceRegistry.healthCheckAll();
    const services = serviceRegistry.getAllServices().map((svc) => ({
      name: svc.name,
      url: svc.url,
      health: svc.health,
      lastCheck: svc.lastCheck?.toISOString() ?? null,
      circuit: circuitBreaker.getStatus(svc.name),
    }));
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services', details: (err as Error).message });
  }
});

// ── GET /admin/metrics — aggregated gateway metrics ─────────────────
adminRouter.get('/metrics', (_req: Request, res: Response) => {
  const services = serviceRegistry.getAllServices();
  const healthy = services.filter((s) => s.health === 'healthy').length;
  const unhealthy = services.filter((s) => s.health === 'unhealthy').length;
  const unknown = services.filter((s) => s.health === 'unknown').length;

  const circuits = circuitBreaker.getAllStatuses();
  const openCircuits = circuits.filter((c) => c.state === 'open').length;

  res.json({
    timestamp: new Date().toISOString(),
    services: {
      total: services.length,
      healthy,
      unhealthy,
      unknown,
    },
    circuits: {
      total: circuits.length,
      open: openCircuits,
      closed: circuits.filter((c) => c.state === 'closed').length,
      halfOpen: circuits.filter((c) => c.state === 'half-open').length,
    },
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

// ── POST /admin/cache/clear — clear all caches ─────────────────────
adminRouter.post('/cache/clear', (_req: Request, res: Response) => {
  // Reset all circuit breakers (acts as a "cache" of failure state)
  circuitBreaker.resetAll();

  res.json({
    message: 'All caches cleared successfully.',
    timestamp: new Date().toISOString(),
  });
});
