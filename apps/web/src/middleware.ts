import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side route protection.
 *
 * There was no middleware at all before this (#80): every dashboard,
 * enterprise and developer route rendered for anyone who typed the URL. The
 * only thing standing in front of them was `AuthGuard`, a client component
 * that redirects after the page has already been sent — and the store it
 * consulted fabricated a session for every visitor anyway, so it never
 * redirected. Both halves are fixed; this is the half that runs before any
 * markup leaves the server.
 *
 * What this does and does not do:
 *
 *   - It checks that a token is *present*, not that it is valid. Verifying the
 *     signature is platform-api's job and it does that on every request (#82).
 *     Middleware runs on the edge runtime, where the signing secret has no
 *     business being, and a route that renders with a bad token still cannot
 *     read any data — every fetch it makes answers 401.
 *   - So this is a redirect for the signed-out, not an authorization boundary.
 *     The authorization boundary is the API. Treating this as the boundary
 *     would be the same mistake as trusting an unverified token.
 */

/** Route prefixes that require a session. */
const PROTECTED_PREFIXES = [
  // (dashboard)
  '/analytics',
  '/assets',
  '/audio',
  '/avatar',
  '/brand',
  '/calendar',
  '/characters',
  '/explore',
  '/live',
  '/marketplace',
  '/notifications',
  '/piracy',
  '/projects',
  '/render-queue',
  '/script',
  '/search',
  '/settings',
  '/style',
  '/team',
  '/timeline',
  // (enterprise)
  '/admin',
  '/audit',
  '/users',
  // (developer)
  '/dev-portal',
  '/keys',
  // (studio) and (onboarding)
  '/studio',
  '/setup',
  '/tour',
  '/welcome',
];

/**
 * Prefixes that stay public even though they sit under a protected group.
 *
 * `/developers`, `/help`, `/changelog` and `/docs` are reference material with
 * no account data on them, and `/a11y-test` is a development harness. Listing
 * them here is deliberate: the default is protected, and anything public is
 * named.
 */
const PUBLIC_EXCEPTIONS = [
  '/developers',
  '/help',
  '/changelog',
  '/docs',
  '/a11y-test',
  '/marketplace/browse',
];

/** The cookie the auth store mirrors the session token into. */
const AUTH_COOKIE = 'animaforge_token';

function isProtected(pathname: string): boolean {
  if (PUBLIC_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token && token.trim() !== '') return NextResponse.next();

  // Carry where they were going, so signing in lands them there rather than on
  // a generic dashboard. The value is a path from this same request, and
  // `/login` only follows values starting with a single '/', so it cannot be
  // turned into an open redirect.
  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  login.searchParams.set('next', `${pathname}${search}`);

  return NextResponse.redirect(login);
}

export const config = {
  /*
   * Everything except:
   *   api/*        — the proxy routes, which answer 401 themselves and must
   *                  return JSON rather than a redirect to an HTML page
   *   _next/*      — build output
   *   *.ext        — static files
   *
   * (auth), (marketing), (legal), /verify and /review are simply absent from
   * PROTECTED_PREFIXES, so they fall through as public.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
