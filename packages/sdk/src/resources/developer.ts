import type { HttpClient } from '../http';

export interface ApiUsage {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  byMethod: Record<string, number>;
  errorRate: number;
  avgLatency: number;
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: string;
  tier: 'free' | 'pro' | 'enterprise';
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed'; description: string }[];
}

export interface SandboxCredentials {
  apiKey: string;
  environment: 'sandbox';
  expiresAt: string;
  testData: { projects: number; characters: number; shots: number };
}

export class DeveloperResource {
  constructor(private readonly http: HttpClient) {}

  async getUsage(period?: string): Promise<ApiUsage> {
    return this.http.get('/developer/usage', period ? { period } : undefined);
  }

  async getRateLimit(): Promise<RateLimitStatus> {
    return this.http.get('/developer/rate-limit');
  }

  async getChangelog(): Promise<ChangelogEntry[]> {
    return this.http.get('/developer/changelog');
  }

  async getSandboxCredentials(): Promise<SandboxCredentials> {
    return this.http.post('/developer/sandbox');
  }
}
