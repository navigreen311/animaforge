import {
  AnimaForgeError,
  AuthenticationError,
  RateLimitError,
  InsufficientCreditsError,
  NotFoundError,
} from './errors';
import type { RequestOptions, ApiResponse } from './types';

const DEFAULT_BASE_URL = 'https://api.animaforge.com/v1';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const url = this.buildUrl(options.path, options.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': '@animaforge/sdk/0.1.0',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const timeout = options.timeout ?? this.timeout;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errorMessage =
            (errorBody as Record<string, string>).message ??
            `Request failed with status ${response.status}`;
          const requestId = response.headers.get('x-request-id') ?? undefined;

          const error = this.createError(
            response.status,
            errorMessage,
            requestId,
            response.headers.get('retry-after')
          );

          if (RETRY_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
            lastError = error;
            await this.sleep(this.getRetryDelay(attempt, response.headers.get('retry-after')));
            continue;
          }

          throw error;
        }

        const data = (await response.json()) as T;
        return { data, status: response.status };
      } catch (err) {
        if (err instanceof AnimaForgeError) {
          throw err;
        }

        lastError = err as Error;

        if (attempt < this.maxRetries) {
          await this.sleep(this.getRetryDelay(attempt));
          continue;
        }
      }
    }

    throw lastError ?? new AnimaForgeError('Request failed', 0, 'unknown_error');
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const response = await this.request<T>({ method: 'GET', path, query });
    return response.data;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.request<T>({ method: 'POST', path, body });
    return response.data;
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.request<T>({ method: 'PUT', path, body });
    return response.data;
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.request<T>({ method: 'PATCH', path, body });
    return response.data;
  }

  async delete<T>(path: string): Promise<T> {
    const response = await this.request<T>({ method: 'DELETE', path });
    return response.data;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private createError(
    status: number,
    message: string,
    requestId?: string,
    retryAfterHeader?: string | null
  ): AnimaForgeError {
    switch (status) {
      case 401:
        return new AuthenticationError(message, requestId);
      case 402:
        return new InsufficientCreditsError(message, requestId);
      case 404:
        return new NotFoundError(message, requestId);
      case 429: {
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        return new RateLimitError(message, retryAfter, requestId);
      }
      default:
        return new AnimaForgeError(message, status, 'api_error', requestId);
    }
  }

  private getRetryDelay(attempt: number, retryAfterHeader?: string | null): number {
    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    return Math.min(1000 * Math.pow(2, attempt), 10_000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
