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
