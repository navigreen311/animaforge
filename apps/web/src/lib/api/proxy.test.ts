/**
 * Proxy helper tests.
 *
 * Every console API route is now built from this one function, so its failure
 * modes are the app's failure modes. The cases that matter are the ones where
 * it would be tempting to return an empty success: no credentials, upstream
 * down, upstream error.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxy, notImplemented } from './proxy';
import type { NextRequest } from 'next/server';

function makeRequest(
  url = 'http://localhost/api/things?page=2',
  headers: Record<string, string> = { authorization: 'Bearer test-token' },
  body?: unknown,
): NextRequest {
  return {
    url,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  } as unknown as NextRequest;
}

function upstream(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('proxy — identity', () => {
  it('401s rather than forwarding an anonymous request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const handler = proxy('GET', '/api/v1/things');
    const res = await handler(makeRequest('http://localhost/api/things', {}), {});

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });
    // The key assertion: it did not reach upstream at all.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards the caller credential unchanged', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(upstream(200, { success: true, data: {} }));
    vi.stubGlobal('fetch', fetchSpy);

    await proxy('GET', '/api/v1/things')(makeRequest(), {});

    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });
});

describe('proxy — request shaping', () => {
  it('substitutes route params into the upstream path', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(upstream(200, { success: true, data: {} }));
    vi.stubGlobal('fetch', fetchSpy);

    await proxy('DELETE', '/api/v1/things/[id]')(makeRequest(), { params: { id: 'abc-123' } });

    expect(fetchSpy.mock.calls[0][0]).toContain('/api/v1/things/abc-123');
  });

  it('forwards the query string on GET', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(upstream(200, { success: true, data: {} }));
    vi.stubGlobal('fetch', fetchSpy);

    await proxy('GET', '/api/v1/things')(makeRequest(), {});

    expect(fetchSpy.mock.calls[0][0]).toContain('page=2');
  });

  it('forwards a JSON body on POST', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(upstream(201, { success: true, data: {} }));
    vi.stubGlobal('fetch', fetchSpy);

    await proxy('POST', '/api/v1/things')(
      makeRequest('http://localhost/api/things', { authorization: 'Bearer t' }, { name: 'x' }),
      {},
    );

    expect(fetchSpy.mock.calls[0][1].body).toBe('{"name":"x"}');
  });
});

describe('proxy — response shaping', () => {
  it('unwraps the platform-api envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(upstream(200, { success: true, data: { id: '1', name: 'Kit' } })),
    );

    const res = await proxy('GET', '/api/v1/things')(makeRequest(), {});
    await expect(res.json()).resolves.toEqual({ id: '1', name: 'Kit' });
  });

  it('re-wraps under a named key when the page expects one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(upstream(200, { success: true, data: [{ id: '1' }] })),
    );

    const res = await proxy('GET', '/api/v1/teams', { envelope: 'teams' })(makeRequest(), {});
    await expect(res.json()).resolves.toEqual({ teams: [{ id: '1' }] });
  });
});

describe('proxy — failure is never a fabricated success', () => {
  it('502s when the platform API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const res = await proxy('GET', '/api/v1/things')(makeRequest(), {});

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    // Emphatically not an empty list: that is what made the console look done.
    expect(body).not.toHaveProperty('items');
  });

  it('passes an upstream error through with its status and code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          upstream(404, { success: false, error: { code: 'NOT_FOUND', message: 'No such thing' } }),
        ),
    );

    const res = await proxy('GET', '/api/v1/things/[id]')(makeRequest(), { params: { id: 'x' } });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: { code: 'NOT_FOUND', message: 'No such thing' },
    });
  });

  it('502s on a non-JSON upstream response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token <');
        },
      } as unknown as Response),
    );

    const res = await proxy('GET', '/api/v1/things')(makeRequest(), {});
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'UPSTREAM_MALFORMED' },
    });
  });
});

describe('notImplemented', () => {
  it('501s with a reason rather than a fabricated success', async () => {
    const res = await notImplemented('/api/billing/checkout', 'Stripe is not configured')(
      makeRequest(),
      {},
    );

    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_IMPLEMENTED');
    expect(body.error.message).toContain('Stripe is not configured');
    expect(body).not.toHaveProperty('success');
  });
});
