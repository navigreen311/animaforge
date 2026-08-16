# Authentication

How a request proves who it is, from the login form to a database row.

This document exists because the answer used to be "it doesn't" — see §1.

---

## 1. The bypass this replaced (#82)

`services/platform-api/src/middleware/auth.ts` decoded the middle segment of
the Bearer token and trusted whatever it found:

```js
const parts = token.split('.');
if (parts.length !== 3) return null;
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
if (payload.sub && payload.email && payload.role) {
  return { id: payload.sub, email: payload.email, role: payload.role };
}
```

No signature verification. No expiry check. `jsonwebtoken` was not a dependency
of the package. platform-api owns every console endpoint and all persisted
data, so any string of the form `<anything>.<base64url claims>.<anything>`
authenticated as whoever the claims named — including `"role": "admin"`.

Reproduced against a running server before the fix, with a victim user and a
private project seeded:

```console
$ FORGED="x.$(node -e "process.stdout.write(Buffer.from(JSON.stringify({
    sub:'22222222-2222-4222-8222-222222222222',
    email:'attacker@evil.example', role:'admin'})).toString('base64url'))").x"

$ curl -H "Authorization: Bearer $FORGED" localhost:4399/api/v1/projects
{"success":true,"data":{"items":[{"id":"3333…","ownerId":"2222…",
 "title":"Victim Secret Project","description":"confidential", …}],"total":1}}
HTTP 200
```

Same request after the fix:

```console
$ curl -H "Authorization: Bearer $FORGED" localhost:4400/api/v1/projects
{"success":false,"error":{"code":"UNAUTHORIZED","message":"Invalid or expired token"}}
HTTP 401
```

The issue was filed as a naming mismatch (`userId` vs `sub`). Renaming the
claim alone would have made login work while leaving the bypass in place, which
is worse than leaving it visibly broken.

---

## 2. The token

One token, issued by `services/auth`, verified by everything else.

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| Algorithm    | **HS256**, pinned on both the signing and verifying side |
| Secret       | `JWT_SECRET`, shared by auth, platform-api and realtime  |
| Subject      | **`sub`** — the registered claim, RFC 7519 §4.1.2        |
| Other claims | `email`, `role`, `tier`, `jti`                           |
| Lifetime     | `JWT_EXPIRES_IN`, default `1h`. `exp` is **required**    |

### Why `sub` and not `userId`

Three services read tokens and each spelled the subject differently: the auth
service signed `userId`, platform-api looked for `sub` and found nothing, and
the realtime service looked for its own `userId`. Standardising on the
registered name means one claim, spelled one way, everywhere. A token carrying
the old `userId` and no `sub` no longer authenticates, and a test pins that so
the old shape cannot quietly return.

### What verification enforces

Every service applies the same three rules:

1. **The signature verifies** against `JWT_SECRET`.
2. **The algorithm is HS256**, enforced by passing an allow-list to
   `jwt.verify`. This is what rejects `alg: none` and stops algorithm
   confusion — without the allow-list a token nominates its own algorithm and
   the library honours it.
3. **`exp` is present and in the future.** `jsonwebtoken` checks `exp` against
   the clock when the claim is present but accepts a token that omits it, so
   the presence check is explicit. Note `requireExp` is a **`jose`** option;
   passing it to `jsonwebtoken` is silently ignored, which looks like a check
   and is not one.

A verified signature proves provenance, not usability: a token that verifies
but carries no `sub` is still rejected.

`optionalAuth` is optional about _presence_, not validity. A token that is
present and fails verification is discarded rather than trusted.

---

## 3. `JWT_SECRET` is required

No service has a fallback. The defaults that used to exist —
`'animaforge-dev-secret'` in auth, `'dev-secret'` in realtime,
`'dev-secret-change-me'` in a platform-api config field — are gone.

A default secret committed to a repository is a published secret: anyone can
mint a valid admin token against a deployment that forgot to set the variable,
and nothing about that deployment looks broken. As a bonus failure mode, those
two live defaults were _different_ strings, so an auth-signed token would have
failed the realtime handshake anyway.

platform-api asserts the secret at startup and exits 1:

```console
$ PORT=4401 npx tsx src/index.ts        # with JWT_SECRET unset
[ERROR] JWT_SECRET is not set. platform-api verifies every request against it
and refuses to start without one — there is no development default, because a
default secret is a published secret. …
EXIT CODE: 1
```

Tests supply their own via a vitest `setupFiles`, generated per run with
`randomBytes` rather than written as a literal.

> **Not fixed, different owner:** `services/collab/src/auth.ts:1` still has
> `process.env.JWT_SECRET || 'dev-secret-change-in-production'`.

---

## 4. The browser side (#80)

### Where the token lives

| Store                              | Read by                                                   |
| ---------------------------------- | --------------------------------------------------------- |
| `localStorage['animaforge_auth']`  | the auth store, for user + token                          |
| `localStorage['animaforge_token']` | `lib/auth.ts` `getToken()`, used by every proxied request |
| cookie `animaforge_token`          | `middleware.ts`, which runs on the server                 |

All three are written by `persistAuth` and cleared by `clearPersistedAuth`. The
two localStorage keys are not redundancy for its own sake — the store was
writing only the first while the API layer read only the second, so requests
went out unauthenticated even while the console said the user was signed in.

The cookie exists because route protection runs server-side and the server
cannot read localStorage. It is not `HttpOnly`: it is written by client code,
and marking it `HttpOnly` would stop the browser accepting it. `SameSite=Lax`
keeps it off cross-site requests. The token's integrity comes from its
signature, not from where the browser keeps it.

### Route protection

`apps/web/src/middleware.ts`. There was no middleware at all before; the only
thing in front of the dashboard was `AuthGuard`, a client component that
redirects after the page has already been sent.

- Protected: the `(dashboard)`, `(enterprise)`, `(developer)`, `(studio)` and
  `(onboarding)` route groups, by prefix.
- Public: `(auth)`, `(marketing)`, `(legal)`, `/verify`, `/review`, and the
  named reference pages that live under `(dashboard)` — `/developers`,
  `/help`, `/changelog`, `/docs`, `/a11y-test`, `/marketplace/browse`.
- A request with no session cookie is redirected to `/login?next=<path>`. The
  login page honours `next` only when it is a single-slash absolute path, so it
  cannot be turned into an open redirect.

**The middleware checks that a token is present, not that it is valid.**
Verifying a signature needs the secret, which has no business on the edge
runtime, and a page that renders with a bad token still cannot read anything —
every request it makes answers 401. This is a redirect for the signed-out. The
authorization boundary is the API. Treating the middleware as the boundary
would be the same category of mistake as trusting an unverified token.

### The demo session that made all of this moot

`authStore.loadFromStorage()` fabricated a session whenever nothing was
persisted:

```js
const demoUser = { id: 'user_demo', email: 'shadow@animaforge.io', … };
persistAuth(demoUser, 'demo_token_animaforge');
```

Every visitor was authenticated, which is why route protection had nothing to
protect. Since #82 that token is not a JWT and every API call made with it is
rejected — the console looked signed in and could load nothing. It is gone.

### Signing out

`authStore.logout()` existed and had no caller anywhere in the app. The avatar
in the top bar was a button labelled "User menu" whose `onClick` body was
`// TODO: open user dropdown`. `UserMenu.tsx` now renders a real
`[role="menu"]`; signing out clears all three stores and replaces to `/login`.

---

## 5. Running it

```bash
export JWT_SECRET="$(openssl rand -hex 32)"   # same value for all three
export DATABASE_URL=postgresql://…            # auth and platform-api share it
```

`services/auth` signs. `services/platform-api` and `services/realtime` verify.
A mismatch is now a 401 on every request rather than something nothing noticed.

### The e2e harness

`playwright.config.ts` starts auth (:3003), platform-api (:4000) and a
production build of the web app (:3000), all on one `JWT_SECRET` and one
`DATABASE_URL`. `tests/e2e/fixtures/global-setup.ts` registers the fixture user
through the real `/auth/register`, logs in, and creates the fixture project
through platform-api **with the token auth just issued** — so a disagreement
about the secret or the claim fails setup loudly instead of leaving six specs
asserting against an empty page.

```bash
createdb animaforge_e2e
DATABASE_URL=… npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
DATABASE_URL=… npm run db:seed --workspace @animaforge/db
npx playwright test --project=chromium
```

Ports are overridable (`E2E_WEB_PORT`, `E2E_AUTH_PORT`, `E2E_PLATFORM_PORT`)
for when something else already holds one.

---

## 6. The job queue (#80)

Included here because submission is authenticated and ownership-checked.

The pipeline had a consumer and no producer: `services/workers` declared five
BullMQ queues and ran a 600-line generation worker, but nothing in the
repository ever called `generationQueue.add()`. A job could not be started from
anywhere and `/render-queue` was permanently empty.

`POST /api/v1/jobs` closes it. In order:

1. Validate, and check the caller **owns the project** — otherwise the job
   would be created against someone else's project and its output would land
   there.
2. Write the `generation_jobs` row as `queued`.
3. Enqueue under **that row's id**, so every status the worker writes lands on
   the row the console is already displaying.

The row is written before the enqueue deliberately: a deployment with no worker
running then shows a queue that is filling up, which is true, rather than one
that looks empty. If the enqueue fails, the row is marked `failed` with the
reason and the response is 503 — a row left at `queued` reads as "waiting its
turn" when nothing will ever run it.

The two services share a contract, not code:

|            |                                                          |
| ---------- | -------------------------------------------------------- |
| Queue name | `generation`                                             |
| Job name   | `generate`                                               |
| Payload    | `{ type, project_id, user_id, params, tier, priority? }` |
| Job id     | the `generation_jobs` row id                             |

The payload is `GenerationJobData` in
`services/workers/src/workers/generationWorker.ts`. Renaming a field on one
side breaks the pipeline silently — the job is accepted and then fails inside
the worker — so the shape is pinned by a test.

Verified end to end against Postgres and Redis with the worker running:

```
submit   -> HTTP 201, status queued
db row   -> queued
bullmq   -> job present under the same id, payload matching GenerationJobData
listing  -> visible as queued
worker   -> queued -> running -> failed   (AI API unreachable locally; the
            reason is recorded on the row), retried 3x per the queue's backoff
```
