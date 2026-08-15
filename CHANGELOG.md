# Changelog

All notable changes to AnimaForge are documented here.

## [Unreleased]

### Fixed — CI had never passed

CI was red on `main` from 2026-04-10 and no PR could merge green. The cause was
not what it appeared to be.

- **`package-lock.json` was out of sync with `package.json`.** PR #16 added the
  `apps/mobile` and `apps/desktop` workspaces without regenerating it, so
  `npm ci` failed with `EUSAGE` in five of seven jobs. This, not the security
  scan, was the dominant blocker.
- **The Semgrep job was not failing on a dead action.** `semgrep/semgrep-action@v1`
  pulled and ran fine; it exited 1 because it found **20 real security
  findings**. Replaced with the maintained `semgrep/semgrep` container running
  `semgrep scan`, tokenless. 16 of the 20 findings are fixed; the rest are
  recorded in `.github/semgrep/accepted-risks.json` with their rule, path,
  reason and owner. The gate fails on anything **not** in that register.
- **`generationWorker.ts` did not compile.** Eight symbols — `dlq`,
  `estimateGPU`, `findCachedResult`, `getMaxDuration` and four more — were
  declared twice, an expanded version plus a minified copy pasted below it.
  16 TypeScript errors in the core of the product, invisible because `npm ci`
  failed ahead of the type-check job.
- **`test-frontend` tested nothing.** It ran `cd apps/web && vitest`, and
  `apps/web` contains no test files, so it exited 1 with "No test files found".
  Repointed at `tests/unit` (98 tests at the time).
- `@vitest/coverage-v8` was missing entirely although `--coverage` was passed.
- `pytest` crashed at collection: `requirements.txt` pinned pytest 8.2 with
  pytest-asyncio 0.23, an incompatible pair.
- `test-e2e` installed only chromium while `playwright.config.ts` also declared
  firefox.
- An unescaped apostrophe in `lib/email/triggers.ts` made the file unparseable,
  masking every other type error in `apps/web`.
- k8s: `securityContext` on all 15 Deployments. Shell-injection fix in
  `deploy-production.yml`. `USER node` in the gateway image.
- Every GitHub Action reference pinned to a commit SHA (52 at the time; 57
  now, including those added since), with Dependabot scoped to security updates
  and those pins.

### Added — three stack components the README claimed but the repo lacked

- **`packages/events`** — the Kafka event bus. Two versioned topics, zod event
  schemas, a KafkaJS producer/consumer keyed by `correlationId` for per-job
  ordering, and an in-process fallback for local dev. The fallback refuses to
  start under `NODE_ENV=production`: a silent fallback looks healthy from inside
  the process while every other service sees no traffic. `services/workers`
  publishes the full generation lifecycle and both governance events. **Nothing
  consumes them yet.** 39 tests.
- **WebRTC signalling** in `services/live` — SDP/ICE relay over the existing
  socket, session-scoped so a peer cannot signal into a session it has not
  joined, mesh capped at 16 peers. Missing TURN is reported at startup, on
  `/health`, and to every client, because without it ICE simply never completes
  and the user watches a spinner. Signalling only: no SFU, no recording, no auth
  on the socket. 26 tests.
- **`infra/terraform`** — VPC, EKS, RDS PostgreSQL 16, ElastiCache Redis, S3 and
  CloudFront, with defaults taken from the sizing table in `docs/deployment.md`.
  CI runs `fmt`, `validate` on the root and `validate` on each module in
  isolation. **Never applied to an AWS account.**

### Changed — controls no longer claim to do things they cannot

- All **24** `coming soon` handlers closed. Each is now either disabled with a
  specific, checked reason or removed. Reasons live in
  `apps/web/src/app/(dashboard)/components/unavailable/featureStatus.ts`; a test
  enforces that each names a route, env var, package path or vendor.
- **Two controls were fabricating success.** `InviteMemberModal` waited 1.2s on
  a `setTimeout` then reported "Invitation sent to {email}" for mail that never
  left the browser; `ProjectAccessModal` reported "Project access updated"
  without saving. Both now say plainly that nothing is sent or saved.
- A settings "Rate Limit" panel hardcoded to `84 / 100 requests per minute`,
  with its amber threshold driven by the constant comparison `84 > 80`, is
  removed. Nothing measured it.
- `POST /api/analytics/connect` returned `200` with "OAuth flow initiated —
  coming soon" for a flow that never started. Now `501`, naming the missing
  client id and secret.
- `syncOfflineEdits` in `services/collab` returned a conflict count hardcoded to
  zero, so offline edits silently clobbered each other while reporting a clean
  sync. It now detects concurrent edits per field.
- The five stubbed helpers in `lib/email/triggers.ts` are real Prisma queries.
  They returned `null`/`0`, which meant **every transactional email trigger
  silently did nothing** with no error anywhere. A missing database is now a
  named exception rather than a quiet no-op.

### Known — recorded rather than papered over

- **The web dashboard has no persistence layer**: 128 API routes, none touching
  a database; 41 of 46 dashboard pages never fetch from an API at all, and 40
  declare hardcoded data arrays. `services/platform-api` is
  real and Prisma-backed, and the web app never calls it. (#58)
- `lint`, `test-api`, `test-ai-api` and `test-e2e` run and show red but do not
  block merge. Each has a tracking issue and the exclusion is documented inline
  in `ci.yml`. (#18, #21, #23)

  `type-check` is now blocking: all 164 errors across `apps/web` and 15 service
  packages are fixed. The first count was taken against an ungenerated Prisma
  client, which hid another 59 — CI runs `prisma generate`, so it saw them.
  Several were live bugs rather than annotations: `shotController` never
  awaited its async services, `billing`'s portal route called a function that
  does not exist, and three services queried Prisma models absent from the
  schema behind guards that were permanently false. (#19, closed)
- 561 files fail `prettier --check` — the repo has never been formatted. (#18)
- Three of the five images the security workflow scans fail to build. (#20)

### Corrections to the 1.0.0 entry below

Claims in the 1.0.0 release notes that this work found to be inaccurate:

| Claimed | Actual |
|---|---|
| "22 microservices" | 18 service directories; 13 Dockerfiles; 4 of the 22 listed are Python modules inside the AI API |
| "Zustand stores + TanStack Query hooks wired to real APIs" | the APIs return fixed sample data and touch no database |
| "14 Dockerfiles + Docker Compose (20 services)" | 13 Dockerfiles; compose now defines 23 services |
| "200+ test cases" | accurate in total, but the suites were not runnable in CI |
| "pytest for AI API (48 tests across 8 modules)" | 280 tests across 35 modules, 11 failing |

The 1.0.0 entry is left as written; this table records what was wrong rather
than rewriting the history.

## [1.0.0] - 2026-03-25 (Production Release)

### Platform
- 22 microservices across 4 Kubernetes namespaces
- API Gateway with rate limiting, circuit breaker, service registry
- PostgreSQL 16 + pgvector with full migration and seed data
- Redis for sessions, caching, job queues, and rate limiting
- Elasticsearch for semantic search with vector embeddings
- S3/MinIO for media storage with lifecycle management
- BullMQ job queue with generation, governance, QC, export, and cleanup workers

### AI Engine (FastAPI)
- 11-stage generation pipeline (intent → delivery)
- 19 route modules covering video, audio, avatar, style, script, music, dubbing, mocap, continuity, physics, memory, training, cartoon pro, QC
- Claude API integration for script generation with streaming
- ML-based model router with A/B testing and performance tracking
- Comprehensive QC: temporal LPIPS, FID, uncanny valley, motion quality, AV sync

### Governance (Mandatory Pipeline)
- Content moderation with severity scoring
- C2PA manifest signing with HMAC-SHA256
- Durable watermark embedding and detection
- Consent management with immutable rights ledger
- Pre-generation safety gate

### Frontend (Next.js 14)
- 168 files: dashboard, timeline, generation controls, all studio pages
- Canvas 2D + WebGL2 timeline rendering at 60fps
- 3D scene graph editor with node tree and camera path visualization
- Brand kit editor with color, typography, logo, sonic branding
- Zustand stores + TanStack Query hooks wired to real APIs
- WCAG 2.1 AA accessibility (focus management, aria, skip links)
- Onboarding wizard (3 steps) and landing page with pricing

### Mobile (React Native)
- 32 files: navigation, auth, project management, push notifications
- Avatar, style, script studios
- Deep linking (animaforge://) and offline mode with action queue

### Desktop (Electron)
- 15 files: GPU detection, system tray, global shortcuts, splash screen
- Local file access, offline sync, auto-updater
- Cross-platform: Windows, macOS, Linux

### Authentication & Enterprise
- JWT + bcrypt with Redis-backed session management
- OAuth 2.0 (Google, GitHub) with provider auto-detection
- SSO (SAML 2.0 + OIDC) and SCIM 2.0 user provisioning
- RBAC with role-based middleware
- API key management (create, validate, revoke)

### Commerce
- Stripe integration (checkout, portal, webhooks)
- Credit system with tier-based allocations
- Render economics engine with cost estimation and revenue sharing
- Creator marketplace with 70/30 split and payouts
- Talent manager with skill matching and contracts

### Infrastructure
- 24 Kubernetes manifests (HPA, GPU nodes, Prometheus, Grafana)
- 14 Dockerfiles + full-stack Docker Compose (20 services)
- 4 CI/CD workflows (CI, staging deploy, production deploy, security scanning)
- Monitoring: Prometheus alerts, 4 Grafana dashboards
- k6 load testing (7 suites)
- Structured JSON logging (Pino) with request/error middleware

### Testing
- 200+ test cases across unit, integration, and E2E
- Playwright E2E (auth, projects, shots, navigation, generation)
- pytest for AI API (48 tests across 8 modules)
- k6 load tests (health, auth, projects, generation, search, WebSocket, workflow)

### Documentation
- 17 documentation files
- OpenAPI 3.1 specification (150+ endpoints)
- Architecture, database, deployment, security, contributing guides
- Feature docs: avatar, style, timeline, governance, marketplace, plugins, live runtime

### SDK & Developer Platform
- TypeScript SDK (@animaforge/sdk) with typed resources
- Plugin system with certification, hooks, and metrics
- Developer portal with webhook management and sandbox
- CDN edge functions with adaptive bitrate streaming
