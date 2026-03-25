import { useAuthStore } from '@/stores/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const REQUEST_TIMEOUT_MS = 30_000;

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  params?: Record<string, string>;
  /** Skip the automatic retry on 5xx errors. */
  skipRetry?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Error classes                                                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function getJwt(): string | null {
  return useAuthStore.getState().token;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

function showCreditsModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('animaforge:credits-required'));
  }
}

function showRateLimitMessage(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('animaforge:rate-limited', {
        detail: { message: 'Too many requests. Please wait a moment and try again.' },
      }),
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Core request function                                              */
/* ------------------------------------------------------------------ */

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { params, skipRetry, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
    );
    if (Object.keys(filtered).length > 0) {
      const searchParams = new URLSearchParams(filtered);
      url += `?${searchParams.toString()}`;
    }
  }

  // -- Request interceptor: attach JWT ---------------------------------
  const token = getJwt();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // -- Timeout via AbortController -------------------------------------
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
    ...init,
  };

  let response: Response;

  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(0, 'Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // -- Response interceptor: status-specific handling ------------------
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    const message = errorBody.message || `Request failed: ${response.status}`;

    // 401 — Unauthorized → redirect to login
    if (response.status === 401) {
      useAuthStore.getState().logout();
      redirectToLogin();
      throw new ApiError(401, message);
    }

    // 402 — Payment required → show credits modal
    if (response.status === 402) {
      showCreditsModal();
      throw new ApiError(402, message);
    }

    // 429 — Rate limited
    if (response.status === 429) {
      showRateLimitMessage();
      throw new ApiError(429, message);
    }

    // 5xx — Retry once
    if (response.status >= 500 && !skipRetry) {
      return request<T>(method, path, body, { ...options, skipRetry: true });
    }

    throw new ApiError(response.status, message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Public API client                                                  */
/* ------------------------------------------------------------------ */

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),

  /** Upload a file via multipart/form-data (bypasses JSON serialization). */
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getJwt();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiError(response.status, errorBody.message || `Upload failed: ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },
};
