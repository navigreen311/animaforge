/**
 * Dynamic service registry with periodic health checking.
 *
 * Services are registered with a base URL and an optional health-check
 * path (defaults to /health). Every 30 s the registry polls each service
 * and updates its status.
 */

export type ServiceHealth = 'healthy' | 'unhealthy' | 'unknown';

export interface RegisteredService {
  name: string;
  url: string;
  healthPath: string;
  health: ServiceHealth;
  lastCheck: Date | null;
}

// ── Registry ─────────────────────────────────────────────────────────
class ServiceRegistry {
  private services: Map<string, RegisteredService> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_MS = 30_000;

  // ── Registration ─────────────────────────────────────────────────
  registerService(
    name: string,
    url: string,
    healthPath: string = '/health',
  ): RegisteredService {
    const entry: RegisteredService = {
      name,
      url: url.replace(/\/+$/, ''), // strip trailing slashes
      healthPath,
      health: 'unknown',
      lastCheck: null,
    };
    this.services.set(name, entry);
    console.log(`[registry] registered service "${name}" at ${url}`);
    return entry;
  }

  deregisterService(name: string): boolean {
    const deleted = this.services.delete(name);
    if (deleted) {
      console.log(`[registry] deregistered service "${name}"`);
    }
    return deleted;
  }

  // ── Queries ──────────────────────────────────────────────────────
  getService(name: string): RegisteredService | undefined {
    return this.services.get(name);
  }

  getAllServices(): RegisteredService[] {
    return [...this.services.values()];
  }

  getHealthyServices(): RegisteredService[] {
    return this.getAllServices().filter((s) => s.health === 'healthy');
  }

  // ── Health check ─────────────────────────────────────────────────
  async healthCheck(name: string): Promise<ServiceHealth> {
    const svc = this.services.get(name);
    if (!svc) return 'unknown';

    try {
      const url = `${svc.url}${svc.healthPath}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      svc.health = res.ok ? 'healthy' : 'unhealthy';
    } catch {
      svc.health = 'unhealthy';
    }

    svc.lastCheck = new Date();
    return svc.health;
  }

  async healthCheckAll(): Promise<void> {
    const checks = [...this.services.keys()].map((name) =>
      this.healthCheck(name),
    );
    await Promise.allSettled(checks);
  }

  // ── Auto-discovery polling ───────────────────────────────────────
  startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      this.healthCheckAll().catch((err) =>
        console.error('[registry] health-check poll error:', err),
      );
    }, this.POLL_MS);
    console.log(`[registry] health-check polling started (${this.POLL_MS}ms)`);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[registry] health-check polling stopped');
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────
export const serviceRegistry = new ServiceRegistry();
