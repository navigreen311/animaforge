import type { HttpClient } from '../http';

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

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  async register(url: string, events: string[]): Promise<Webhook> {
    return this.http.post('/developer/webhooks', { url, events });
  }

  async list(): Promise<Webhook[]> {
    return this.http.get('/developer/webhooks');
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    return this.http.delete(`/developer/webhooks/${id}`);
  }

  async test(id: string): Promise<WebhookLogEntry> {
    return this.http.post(`/developer/webhooks/${id}/test`);
  }

  async getLogs(id: string): Promise<WebhookLogEntry[]> {
    return this.http.get(`/developer/webhooks/${id}/logs`);
  }
}
