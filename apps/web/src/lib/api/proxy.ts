import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * The one pattern every console API route uses.
 *
 * See docs/persistence.md. A route here forwards to `services/platform-api` and
 * does three things and no more: carry the caller's identity, adapt the
 * response shape, and translate errors. It holds no business rules and never
 * touches Prisma — that is what keeps a single writer per table.
 */

export const PLATFORM_API_URL =
  process.env.PLATFORM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** platform-api's envelope. */
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface ProxyOptions {
  /**
   * Rename the unwrapped payload, for pages that expect a named collection
   * (`{ teams: [...] }`) rather than the bare object.
   */
  envelope?: string;
  /** Map the payload after unwrapping. */
  transform?: (data: unknown) => unknown;
  /** Forward the incoming query string. Defaults to true for GET. */
  forwardQuery?: boolean;
}

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Resolve the caller.
 *
 * The console keeps its JWT in localStorage, so the browser sends it on each
 * request and this forwards it. There is no server-side session to read: a
 * request without the header has no identity, and inventing one would let any
 * unauthenticated caller read another user's data.
 */
function authorization(request: NextRequest): string | null {
  return request.headers.get('authorization');
}

/** Build the upstream URL, substituting `[param]` segments from the route. */
function upstreamUrl(
  template: string,
  params: Record<string, string | string[]> | undefined,
  request: NextRequest,
  forwardQuery: boolean,
): string {
  let path = template;
  for (const [key, value] of Object.entries(params ?? {})) {
    const v = Array.isArray(value) ? value[0] : value;
    path = path.replace(`[${key}]`, encodeURIComponent(v));
  }
  const url = new URL(path, PLATFORM_API_URL);
  if (forwardQuery) {
    for (const [k, v] of new URL(request.url).searchParams) url.searchParams.append(k, v);
  }
  return url.toString();
}

export type RouteContext = { params?: Record<string, string | string[]> };
export type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse>;

/**
 * Build a route handler that forwards to platform-api.
 *
 * `path` may contain `[id]`-style segments matching the Next route's own
 * params, e.g. `proxy('GET', '/api/v1/avatars/[id]')`.
 */
export function proxy(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: ProxyOptions = {},
): RouteHandler {
  const { envelope, transform, forwardQuery = method === 'GET' } = options;

  return async function handler(request: NextRequest, context: RouteContext) {
    const auth = authorization(request);
    if (!auth) {
      return errorResponse(
        'UNAUTHENTICATED',
        'This request carries no credentials. Sign in and retry.',
        401,
      );
    }

    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = JSON.stringify(await request.json());
      } catch {
        body = undefined;
      }
    }

    const url = upstreamUrl(path, context?.params, request, forwardQuery);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
        },
        body,
        cache: 'no-store',
      });
    } catch (err) {
      // A transport failure is ours, not the caller's, and it is emphatically
      // not an empty result: answering 200 with [] here is what made the
      // console look finished when nothing was wired up.
      return errorResponse(
        'UPSTREAM_UNAVAILABLE',
        `Could not reach the platform API at ${PLATFORM_API_URL}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        502,
      );
    }

    let payload: Envelope<unknown>;
    try {
      payload = (await response.json()) as Envelope<unknown>;
    } catch {
      return errorResponse(
        'UPSTREAM_MALFORMED',
        `The platform API returned a non-JSON response (HTTP ${response.status}).`,
        502,
      );
    }

    if (!response.ok || payload.success === false) {
      return NextResponse.json(
        {
          error: payload.error ?? {
            code: 'UPSTREAM_ERROR',
            message: `The platform API returned HTTP ${response.status}.`,
          },
        },
        { status: response.status },
      );
    }

    const data = transform ? transform(payload.data) : payload.data;
    return NextResponse.json(envelope ? { [envelope]: data } : data, { status: response.status });
  };
}

/**
 * A route whose capability is not yet wired up.
 *
 * Returns 501 naming what is missing. This exists so an unfinished route is
 * discoverable as unfinished rather than returning a fabricated success — the
 * exact failure #58 was filed for.
 */
export function notImplemented(what: string, detail: string): RouteHandler {
  return async function handler() {
    return errorResponse('NOT_IMPLEMENTED', `${what} is not available: ${detail}`, 501);
  };
}
