import { v4 as uuidv4 } from 'uuid';

export interface ApiUsage {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  byMethod: Record<string, number>;
  errorRate: number;
  avgLatency: number;
}

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: string[];
  createdAt: string;
  active: boolean;
}

export interface WebhookLogEntry {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  statusCode: number;
  success: boolean;
  deliveredAt: string;
}

export interface SandboxCredentials {
  apiKey: string;
  environment: 'sandbox';
  expiresAt: string;
  testData: { projects: number; characters: number; shots: number };
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed';
    description: string;
  }[];
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: string;
  tier: 'free' | 'pro' | 'enterprise';
}

const webhooks = new Map<string, Webhook>();
const webhookLogs = new Map<string, WebhookLogEntry[]>();
const sandboxKeys = new Map<string, SandboxCredentials>();
const rateLimits = new Map<string, RateLimitStatus>();

const changelog: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-03-20',
    changes: [
      { type: 'added', description: 'Developer portal webhooks API' },
      { type: 'added', description: 'Sandbox credential generation' },
      { type: 'changed', description: 'Rate limit headers now include X-RateLimit-Tier' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-15',
    changes: [
      { type: 'added', description: 'Content verification (C2PA) endpoints' },
      { type: 'added', description: 'Onboarding flow with style quiz' },
      { type: 'fixed', description: 'Asset upload timeout on large files' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-10',
    changes: [
      { type: 'added', description: 'Initial public API release' },
      { type: 'added', description: 'Projects, scenes, shots, characters CRUD' },
      { type: 'added', description: 'Video/audio generation pipeline' },
    ],
  },
];

export const devportalService = {
  getApiUsage(userId: string, period: string = '30d'): ApiUsage {
    const multiplier = period === '7d' ? 0.25 : period === '24h' ? 0.03 : 1;
    const base = (Math.abs(hashCode(userId)) % 5000) + 500;
    const total = Math.round(base * multiplier);
    return {
      totalRequests: total,
      byEndpoint: {
        '/projects': Math.round(total * 0.3),
        '/shots': Math.round(total * 0.25),
        '/generate/video': Math.round(total * 0.2),
        '/characters': Math.round(total * 0.15),
        '/assets': Math.round(total * 0.1),
      },
      byMethod: {
        GET: Math.round(total * 0.6),
        POST: Math.round(total * 0.3),
        PUT: Math.round(total * 0.05),
        DELETE: Math.round(total * 0.05),
      },
      errorRate: parseFloat((Math.random() * 3).toFixed(2)),
      avgLatency: parseFloat((80 + Math.random() * 120).toFixed(1)),
    };
  },

  createWebhook(userId: string, url: string, events: string[]): Webhook {
    const webhook: Webhook = {
      id: uuidv4(),
      userId,
      url,
      events,
      createdAt: new Date().toISOString(),
      active: true,
    };
    webhooks.set(webhook.id, webhook);
    return webhook;
  },

  listWebhooks(userId: string): Webhook[] {
    return Array.from(webhooks.values()).filter((w) => w.userId === userId);
  },

  deleteWebhook(userId: string, webhookId: string): boolean {
    const webhook = webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) return false;
    webhooks.delete(webhookId);
    webhookLogs.delete(webhookId);
    return true;
  },

  /**
   * Send a test delivery to one of the caller's own webhooks.
   *
   * `userId` is required and checked. Without it this method took any webhook
   * id and fired a delivery for it, so an authenticated user could probe and
   * trigger deliveries on webhooks belonging to anyone else — the id is a
   * bare uuid and ownership was never consulted. A webhook the caller does not
   * own is reported as not found rather than forbidden, so the endpoint does
   * not confirm that some other user's webhook id exists.
   */
  testWebhook(userId: string, webhookId: string): WebhookLogEntry {
    const webhook = webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) {
      throw new Error('Webhook ' + webhookId + ' not found');
    }
    const log: WebhookLogEntry = {
      id: uuidv4(),
      webhookId,
      event: 'test.ping',
      payload: {
        type: 'test.ping',
        timestamp: new Date().toISOString(),
        data: { message: 'This is a test webhook delivery from AnimaForge' },
      },
      statusCode: 200,
      success: true,
      deliveredAt: new Date().toISOString(),
    };
    const logs = webhookLogs.get(webhookId) ?? [];
    logs.push(log);
    webhookLogs.set(webhookId, logs);
    return log;
  },

  /**
   * Delivery logs for one of the caller's own webhooks.
   *
   * `userId` is required and checked, for the same reason as {@link testWebhook}:
   * without it, any authenticated user could read the delivery history —
   * including payloads — of any webhook whose id they could guess or observe.
   * An unowned or unknown id returns an empty list, which is what a caller with
   * no webhooks of that id should see either way.
   */
  getWebhookLogs(userId: string, webhookId: string): WebhookLogEntry[] {
    const webhook = webhooks.get(webhookId);
    if (!webhook || webhook.userId !== userId) return [];
    return webhookLogs.get(webhookId) ?? [];
  },

  getSandboxCredentials(userId: string): SandboxCredentials {
    const existing = sandboxKeys.get(userId);
    if (existing && new Date(existing.expiresAt) > new Date()) {
      return existing;
    }
    const creds: SandboxCredentials = {
      apiKey: 'sb_' + uuidv4().replace(/-/g, ''),
      environment: 'sandbox',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      testData: { projects: 3, characters: 5, shots: 12 },
    };
    sandboxKeys.set(userId, creds);
    return creds;
  },

  getApiChangelog(): ChangelogEntry[] {
    return changelog;
  },

  getRateLimitStatus(userId: string): RateLimitStatus {
    const existing = rateLimits.get(userId);
    if (existing && new Date(existing.resetAt) > new Date()) {
      return existing;
    }
    const tier = (['free', 'pro', 'enterprise'] as const)[Math.abs(hashCode(userId)) % 3];
    const limitByTier = { free: 1000, pro: 10000, enterprise: 100000 };
    const limit = limitByTier[tier];
    const status: RateLimitStatus = {
      limit,
      remaining: Math.round(limit * (0.4 + Math.random() * 0.5)),
      resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      tier,
    };
    rateLimits.set(userId, status);
    return status;
  },

  resetStore(): void {
    webhooks.clear();
    webhookLogs.clear();
    sandboxKeys.clear();
    rateLimits.clear();
  },
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
