import type { Request, Response, NextFunction } from 'express';

/**
 * Remove client-supplied identity headers before any handler can read them.
 *
 * ## Why this exists
 *
 * The gateway sets `x-user-id` / `x-user-role` / `x-user-tier` from a verified
 * token and proxies the request here. That is a reasonable pattern, but it only
 * holds if two things are true: the gateway verifies the token (it does now),
 * and platform-api is unreachable except through the gateway (it is not).
 *
 * platform-api listens on its own port. In development it is on :3001 next to
 * the gateway on :4000; in the compose and k8s topologies it is a service other
 * pods can address directly. Anything that can reach it can set these headers
 * itself, and `routes/devportal.ts` read them as identity:
 *
 *     const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';
 *
 * A single `curl -H 'x-user-id: <victim>'` with no token at all created and
 * listed webhooks as that user. Fixing devportal to use `requireAuth` closes
 * that route; this middleware closes the *class*, so the next handler that
 * reaches for a convenient header cannot reintroduce it.
 *
 * ## The rule
 *
 * Identity comes from the verified JWT and nothing else. These headers are
 * stripped unconditionally on entry — there is no allow-list for a trusted
 * proxy, because "the request came from the gateway" is itself only as
 * trustworthy as the network, and this service should not depend on network
 * position for authentication. `req.user`, populated by `requireAuth` after a
 * signature check, is the only identity any handler should consult.
 *
 * Stripping rather than rejecting is deliberate: a client that sends one of
 * these is not necessarily hostile (a proxy chain may add them), and a 400
 * would turn a harmless header into an outage. Removing it is sufficient and
 * cannot break a caller that was not relying on the bypass.
 */

/** Headers a gateway may legitimately set, and which a client may never assert. */
export const IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-role',
  'x-user-tier',
  'x-user-email',
] as const;

export function stripIdentityHeaders(req: Request, _res: Response, next: NextFunction): void {
  for (const header of IDENTITY_HEADERS) {
    delete req.headers[header];
  }
  next();
}
