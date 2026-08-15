'use client';

import { useCallback, useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

/**
 * Fetch one console API resource, with the three states a page must render.
 *
 * `error` is deliberately not collapsed into `data === null`. A page that shows
 * an empty list when the request failed tells the user "you have nothing",
 * which is the same lie as a route that fabricates a write — see
 * docs/persistence.md section 6.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
}

export interface ResourceState<T> {
  data: T | null;
  /** Null until something goes wrong; never inferred from an empty result. */
  error: ApiErrorShape | null;
  loading: boolean;
  /** Re-run the request. */
  reload: () => void;
}

/** Send the console's bearer token, matching what the proxy routes require. */
export function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readError(response: Response): Promise<ApiErrorShape> {
  try {
    const body = (await response.json()) as { error?: ApiErrorShape };
    if (body.error) return body.error;
  } catch {
    // fall through to the status-only message
  }
  return {
    code: `HTTP_${response.status}`,
    message: `The request failed with HTTP ${response.status}.`,
  };
}

export function useResource<T>(path: string | null, deps: unknown[] = []): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiErrorShape | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(path, { headers: authHeaders(), cache: 'no-store' })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setError(await readError(response));
          setData(null);
          return;
        }
        setData((await response.json()) as T);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError({
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : String(err),
        });
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  return { data, error, loading, reload };
}

/** Send a write to a console API route and surface a real error. */
export async function mutate<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<{ data: T | null; error: ApiErrorShape | null }> {
  try {
    const response = await fetch(path, {
      method,
      headers: authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) return { data: null, error: await readError(response) };
    // 204 and friends carry no body.
    const text = await response.text();
    return { data: text ? (JSON.parse(text) as T) : null, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
