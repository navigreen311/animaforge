# CI and container pipeline

How AnimaForge's CI is wired, what each job actually checks, and what it does
not. Counts here come from commands that were run; where something is unverified
it says so.

---

## Container images

### Build contexts

Five images are built and scanned by `.github/workflows/security.yml`; twelve
are built by the deploy workflows. Each matrix entry carries both a `context`
and a `file`, because they are not always the same directory.

| Image        | Context            | Dockerfile                         |
| ------------ | ------------------ | ---------------------------------- |
| platform-api | `.`                | `services/platform-api/Dockerfile` |
| auth         | `.`                | `services/auth/Dockerfile`         |
| web          | `.`                | `apps/web/Dockerfile`              |
| gateway      | `services/gateway` | `services/gateway/Dockerfile`      |
| ai-api       | `services/ai-api`  | `services/ai-api/Dockerfile`       |

The first three build from the repo root because they are npm workspaces: the
lockfile lives at the root, and `apps/web` additionally imports the
`@animaforge/db` workspace package. gateway and ai-api keep their own directory
as context — both already built, and neither needs anything above itself.

A root `.dockerignore` keeps root-context builds from uploading `node_modules`
and every `.next` directory to the daemon. Note that `docker/.dockerignore` has
never applied to anything: Docker only reads `.dockerignore` from the root of
the build context, and no image is built with `docker/` as its context.

### What was broken (#20)

Three of five images failed to build, so Trivy never ran against them. All
three died on the same instruction:

```
npm error code EUSAGE
npm error The `npm ci` command can only install with an existing
npm error package-lock.json or npm-shrinkwrap.json ...
```

Fixing the context exposed further faults, each real:

| Image        | Faults                                                                                                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| platform-api | no lockfile in context; no build step at all despite `CMD ["node","dist/index.js"]`; `--production` omitted the TypeScript that produces `dist/`; `src/db.ts` needs a generated Prisma client or `tsc` fails on Prisma's model types                     |
| auth         | the same three, copied verbatim                                                                                                                                                                                                                          |
| web          | no lockfile; needs the `@animaforge/db` workspace, invisible from an `apps/web` context; copied `.next/standalone`, which is never produced because `next.config.js` does not set `output: 'standalone'`; copied `apps/web/public`, which does not exist |

Separately, `next build` was failing on `main` — `useSearchParams()` at
`/avatar` without a Suspense boundary — so no web image could have built
regardless of the Dockerfile. Fixed in the same branch.

`security.yml` also had no `permissions:` block, so every `upload-sarif` step
failed with `Resource not accessible by integration`. Even the two images that
did build never got their findings into the Security tab. The workflow now
requests `contents: read`, `security-events: write`, `actions: read`.

### Prisma on Alpine

`node:20-alpine` does not ship OpenSSL, and Prisma's engines link against it.
Without it `prisma generate` warns:

```
prisma:warn Prisma failed to detect the libssl/openssl version to use,
and may not work as expected. Defaulting to "openssl-1.1.x".
```

and can select an engine that does not match the runtime image — a warning at
build time, a failure at first query. All three Node images install `openssl`
in both the build and runtime stages.

---

## Vulnerability findings

Measured from Security Scanning run **31915718483**, the first run in which all
five images built. Trivy is configured with `severity: CRITICAL,HIGH` and
`exit-code: '0'` — it **reports, it does not gate**. Nothing below is
suppressed.

| Image        | Unique CVEs | CRITICAL | HIGH | No fix available |
| ------------ | ----------- | -------- | ---- | ---------------- |
| platform-api | 117         | 3        | 58   | 2                |
| auth         | 117         | 3        | 58   | 2                |
| web          | 117         | 3        | 58   | 2                |
| ai-api       | 93          | 4        | 13   | 70               |
| gateway      | 16          | 1        | 7    | 0                |

### CRITICAL findings

| CVE            | Package       | Images                           | Fix                         |
| -------------- | ------------- | -------------------------------- | --------------------------- |
| CVE-2025-29927 | `next`        | platform-api, auth, web          | 14.2.25 (repo is on 14.2.0) |
| CVE-2026-9277  | `shell-quote` | platform-api, auth, web          | 1.8.4                       |
| CVE-2026-59873 | `tar`         | platform-api, auth, web, gateway | 7.5.19                      |
| CVE-2026-13221 | `perl-base`   | ai-api                           | **none**                    |
| CVE-2026-42496 | `perl-base`   | ai-api                           | **none**                    |
| CVE-2026-57433 | `perl-base`   | ai-api                           | **none**                    |
| CVE-2026-8376  | `perl-base`   | ai-api                           | **none**                    |

**CVE-2025-29927 is a genuine exposure for the web image**, which runs Next
14.2.0. It is a middleware authorization bypass. The fix is a dependency bump
in `apps/web/package.json`, which belongs to the web owner, not to this track.

### CVEs with no fix available

**ai-api — 70 of 93, including all 4 CRITICALs.** The base image is
`python:3.11-slim`, i.e. Debian, and the unfixed findings are Debian system
packages with no patched version published:

| Package       | No-fix CRITICAL | No-fix HIGH |
| ------------- | --------------- | ----------- |
| `perl-base`   | 4               | 4           |
| `util-linux`  | –               | 1           |
| `gzip`        | –               | 1           |
| `libacl1`     | –               | 1           |
| `ncurses-bin` | –               | 1           |

None of these can be resolved by anything in this repository. They clear when
Debian publishes patched packages and the base image is rebuilt, or by moving
to a smaller base (`python:3.11-alpine` drops `perl-base` entirely, but Alpine's
musl requires rebuilding any wheel with a C extension — numpy is already a
dependency of the X5 avatar pipeline, so that is not free).

**Node images — 2 of 117.** `CVE-2025-71329` and `CVE-2025-71330`, both HIGH,
both in `image-size`, no patched version published.

### Known limitation: hoisted dependencies inflate service images

`platform-api`, `auth` and `web` report an identical 117 CVEs because all three
copy the whole workspace `node_modules` from the build stage. npm hoists to the
root, so the platform-api image physically contains `next` — and therefore
reports `CVE-2025-29927` — even though nothing in that image executes it.

The findings are real (the files are present); the exposure is not equivalent
across the three. Slimming the service images to only the packages they execute
(`npm ci --omit=dev --workspace <name>` in a dedicated runtime install stage)
would drop them toward gateway's 16. Not attempted here, because it risks the
builds that were just made to work for the first time and cannot be verified
locally.

---

## Verification limits

There is no Docker daemon on the machine this work was done on. **No image
build was executed locally.** What was verified locally is that every step the
Dockerfiles invoke succeeds outside Docker:

| Step                                           | Result            |
| ---------------------------------------------- | ----------------- |
| `npm ci`                                       | 2878 packages     |
| `npx prisma generate`                          | OK                |
| `cd services/platform-api && npx tsc --noEmit` | 0 errors          |
| `cd services/auth && npx tsc --noEmit`         | 0 errors          |
| `cd apps/web && npx next build`                | exit 0, 138 pages |

The builds themselves are verified only by CI, in Security Scanning run
31915718483, where all five container jobs report success.

---

## GitHub Actions versions

Every action is SHA-pinned with a `# vN` comment, and all of them were moved to
their current major together in one change (#52) rather than in eleven
Dependabot PRs. Pinning to a SHA is what makes the comment load-bearing: the
comment says what you meant, the SHA says what actually runs.

Two of these had breaking changes worth checking, and both were checked:
`upload-artifact` v4+ makes artifacts immutable, so two uploads sharing a name
fail the run — all eleven artifact names in this repo are distinct within their
workflow, and the only parameterised one is keyed by matrix service.
`codeql-action` v4 changes CLI-version handling, which does not affect
`upload-sarif`, the only part of it used here.

The upgrade cleared the deprecation CI printed on every run: the pinned
versions were all Node-20-era and were being forced onto Node 24 by the runner.

When bumping, resolve the SHA from the API against the tag rather than copying
it out of a changelog, and dereference annotated tags to their commit.

---

## Deployment workflows are switched off

`Deploy to Production` and `Deploy to Staging` no longer run on push. They ran
on every merge to `main` and `develop` respectively and failed every time; a
permanently red workflow trains people to stop reading red.

Neither can succeed today, for three reasons that are all missing
infrastructure rather than bugs:

1. **No repository secrets exist.** `gh secret list` returns nothing.
   Production needs `PRODUCTION_KUBECONFIG`, `PRODUCTION_BASE_URL` and
   `PRODUCTION_INTERNAL_URL`; staging needs `STAGING_KUBECONFIG`. The deploy
   step pipes an empty string through `base64 -d` and writes a garbage
   kubeconfig.
2. **There is no cluster, and no `k8s/overlays/production/`** — the path
   `kubectl apply -k` targets. `k8s/` has no overlays directory at all.
3. **Four services in the build matrix have no Dockerfile**: `export`,
   `notification`, `search`, `analytics`. `export` fails first and cancels the
   other eleven, which is the error the run actually shows.

Both keep `workflow_dispatch`, and both now start with a `preflight` job that
every other job depends on. It names precisely which secret, path or Dockerfile
is missing instead of letting the run die at `base64 -d` several jobs later.

Re-enable the push trigger when preflight passes.

---

## End-to-end tests

`playwright.config.ts` starts three real servers and runs Chromium against
them:

| Port | Service                 | Notes                                                                              |
| ---- | ----------------------- | ---------------------------------------------------------------------------------- |
| 3003 | `services/auth`         | Real bcrypt comparison and JWT issue. Runs on its in-memory user store — see below |
| 4000 | `services/platform-api` | Reads the migrated and seeded database                                             |
| 3000 | `apps/web`              | **Production build**, not `next dev`                                               |

Ports are overridable with `E2E_WEB_PORT`, `E2E_AUTH_PORT` and
`E2E_PLATFORM_PORT`, because a developer whose 4000 is already taken should not
have to edit the config — and the failure when they cannot is an opaque
"Process from config.webServer exited early".

The web server is a production build on purpose. `next dev` compiles each route
on first request, so the first navigation to a page takes tens of seconds and
every later one takes milliseconds. That is the single largest source of flake
in a Playwright suite and no amount of waiting fixes it.

`retries` is 0. A retry turns an intermittent failure into a green run and
hides it.

### Running it locally

```bash
createdb animaforge_e2e
export E2E_DATABASE_URL=postgresql://USER:PASS@localhost:5432/animaforge_e2e
DATABASE_URL=$E2E_DATABASE_URL npx prisma generate --schema packages/db/prisma/schema.prisma
DATABASE_URL=$E2E_DATABASE_URL npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
DATABASE_URL=$E2E_DATABASE_URL npm run db:seed --workspace @animaforge/db
npx playwright test
```

Redis must be reachable at `redis://localhost:6379` (or set `E2E_REDIS_URL`).
`services/auth`'s `createSession()` reaches for it on **every login**, and with
no server node-redis retries rather than failing fast, so `/auth/login` hangs
until the caller times out. That is what it looks like when the service is
missing, and it is worth recognising.

The seed is **not idempotent** — a second run fails on a unique constraint on
`slug`. CI gets a fresh Postgres each time so it never notices; locally, drop
and recreate the database rather than re-seeding.

### What is covered, and what is skipped

10 pass, 8 skipped, 0 fail. Every skip is a `test.skip` with an inline reason
and an issue, never a deletion and never an assertion loosened until it passes.

- **#80** — three flows have no implementation to test: there is no logout
  control (the "User menu" opens nothing and nothing calls `authStore.logout()`),
  dashboard routes are not protected (no middleware; the layout renders
  regardless of auth state), and nothing consumes a generation request.
- **#82** — five specs need the console to load data, and it cannot.
  `services/auth` signs a token carrying `userId`; `services/platform-api`
  requires `sub`. Every authenticated request answers 401
  `AUTH_TOKEN_MALFORMED`, so pages render their shell and nothing else. The
  same middleware does not verify signatures at all, so anyone can mint
  `{"sub":"…","role":"admin"}` and be that user.

The auth service runs on its in-memory store rather than Postgres because
platform-api cannot accept its tokens anyway (#82), so a shared user row buys
no coverage today. Point it back at the database when #82 is fixed.

All eight of these previously "passed" — the original specs wrapped their
assertions in `if (await x.isVisible().catch(() => false))`, which passes
whether or not the thing exists.

---

## The merge gate

`ci-passed` decides what blocks merge. Every job still runs and still shows its
own tick; the gate only decides which failures stop a PR.

| Job             | Blocks merge |
| --------------- | ------------ |
| lint            | **yes**      |
| type-check      | **yes**      |
| test-frontend   | **yes**      |
| terraform       | **yes**      |
| test-governance | **yes**      |
| test-api        | **yes**      |
| test-ai-api     | **yes**      |
| test-e2e        | **yes**      |
| security-scan   | **yes**      |

Three jobs were returned to the blocking list once their backlogs were clear.
Measured directly rather than inferred from a green tick:

| Job           | Was                    | Now                             |
| ------------- | ---------------------- | ------------------------------- |
| `test-api`    | 35 of 117 failing      | 152 passed, 1 skipped, 0 failed |
| `test-ai-api` | 11 of 280 failing      | 621 passed, 1 skipped, 0 failed |
| `test-e2e`    | never verified to pass | 10 passed, 8 skipped, 0 failed  |

`lint` was the last exemption and #84 cleared it: **207 ruff errors to 0**, with
the ai-api suite unchanged at 621 passed, 1 skipped. **All nine jobs now block
merge.**

### Ruff

`ruff` is **pinned** in the lint job. Unpinned, the same commit measured 172
errors locally and 207 on the runner, purely from version drift — tolerable
while the job was advisory, not once it gates merge. Bump the pin deliberately.

`services/ai-api/ruff.toml` pins two things that were making the answer depend
on where you stood:

- `src = ["."]` — isort classifies first-party packages from the project root it
  detects, and the two obvious invocations detected different roots.
  `ruff check services/ai-api/` from the repo root reported 0 while
  `cd services/ai-api && ruff check .` reported 39, all `I001`. CI was the
  lenient one, so making them agree meant fixing 55 more findings, not fewer.
- `target-version = "py311"` — so the pyupgrade rules do not change their mind
  based on whichever interpreter happens to run ruff.

Neither setting narrows the rule set; the default selection is untouched.

Six findings are suppressed with `# noqa` and a written reason rather than
"fixed", because fixing them would have changed behaviour:

- **`TRY004` ×3** in `scene_graph_engine.py` — ruff wants `TypeError` for type
  validation. `src/main.py` maps `ValueError` to HTTP 422; raising `TypeError`
  would fall through to the generic handler and turn a client's malformed
  payload into a 500.
- **`BLE001` ×3** — the Redis reachability probe in `job_manager.py` and the two
  Claude-API fallbacks. All three are deliberately broad: degrading to the
  in-memory store or the mock generator _is_ the documented behaviour, and a
  narrower except would turn an unanticipated client error into a failed startup
  or a 500.

**Do not let the exemption list grow.** A job that is exempt without an owner, a
measured count and an issue number is a job nobody is going to fix.
