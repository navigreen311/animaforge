<div align="center">

# AnimaForge

### The World's First Full-Stack AI Animation & Video Production Operating System

[![CI](https://github.com/navigreen311/animaforge/actions/workflows/ci.yml/badge.svg)](https://github.com/navigreen311/animaforge/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.4-blue.svg)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/python-3.11-yellow.svg)](https://python.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/contributing.md)

Built by **Green Companies LLC** | v1.0.0

[Quick Start](#quick-start) | [Architecture](#architecture) | [Services](#services) | [API](#api) | [Docs](#documentation) | [Contributing](#contributing)

</div>

---

## What is AnimaForge?

AnimaForge is a distributed production operating system built around **18 services** for AI-powered animation and video creation. It transforms text scripts and creative direction into fully rendered, provenance-tracked animated video within a single platform.

Every piece of AI-generated content passes through a **mandatory 4-stage governance pipeline** before delivery:

```
Generated Output --> Content Moderation --> Consent Validation --> C2PA Signing --> Watermarking --> Delivered
```

From script to publish-ready video -- one platform, one pipeline, full provenance.

---

## Project status

This section exists because the rest of this README describes an architecture,
and an architecture is not the same thing as a running product. Read it before
the feature tables.

**The web dashboard has no persistence layer.** Of 46 dashboard pages, 5 fetch
from an API at all; 40 declare hardcoded data arrays and render them as if they
were yours. Of 128 API routes under
`apps/web/src/app/api`, **none** connects to a database and none proxies to a
service. `POST /api/team/teams` returns a team it never stores. A real
Prisma-backed backend exists in `services/platform-api`, and the web app does
not call it. Tracked in [#58](https://github.com/navigreen311/animaforge/issues/58).

Controls that cannot work are disabled and say why, rather than showing a
plausible success. The reason for each is recorded in
`apps/web/src/app/(dashboard)/components/unavailable/featureStatus.ts`.

**What is genuinely wired end to end**

| | |
|---|---|
| Governance pipeline | C2PA signing, moderation, consent, watermarking |
| Generation worker | 11 stages, publishing lifecycle events to Kafka |
| Yjs CRDT collaboration | `services/collab` — persistence, awareness, shot locking |
| WebRTC signalling | `services/live` — SDP/ICE relay, session-scoped |
| Transactional email triggers | real queries against Prisma |

**What exists but is not connected**

| | |
|---|---|
| Kafka | `services/workers` publishes; **nothing consumes yet** |
| Terraform | validates cleanly; **never applied to an AWS account** |
| WebRTC | signalling only — no SFU, no TURN configured, no auth on the socket |
| `services/platform-api` | real and Prisma-backed; the web app never calls it |

**CI**: `test-frontend`, `test-governance`, `terraform` and `security-scan`
block merge. `lint`, `type-check`, `test-api`, `test-ai-api` and `test-e2e`
still run and still show red, but do not block — each has a tracking issue and
the exclusion is documented inline in `.github/workflows/ci.yml`. See
[#18](https://github.com/navigreen311/animaforge/issues/18),
[#19](https://github.com/navigreen311/animaforge/issues/19),
[#21](https://github.com/navigreen311/animaforge/issues/21),
[#23](https://github.com/navigreen311/animaforge/issues/23).

---

## Key Features

These describe the services and pipelines in this repository. Where a feature is
implemented but not reachable from the dashboard, see **Project status** above.

| Feature | Description |
|---------|-------------|
| **AI Video Generation** | 11-stage pipeline with intelligent model router for text-to-video with style consistency and character identity |
| **Avatar Studio (X5)** | 7-step photorealistic digital human reconstruction from reference images |
| **Style Intelligence (X6)** | Extract style fingerprints and reapply them across shots for visual coherence |
| **Script AI (G1)** | Claude-powered streaming script generation with shot decomposition and prompt generation |
| **Timeline Editor** | WebGL2/Canvas 2D rendering at 60fps with keyframe animation and multi-track editing |
| **Multiplayer (F1)** | Yjs CRDT real-time collaboration with presence, cursors, and live comments |
| **Governance Pipeline** | C2PA signing, invisible watermarking, consent validation, and content moderation on every output |
| **Music (F3)** | Scene-aware AI composition with stem generation and sound effects |
| **Physics (F5)** | Position-based dynamics for cloth, hair, rigid body, and fluid simulation |
| **22 Languages** | AI dubbing, voice cloning, and full localization pipeline |
| **Marketplace** | Creator economy for styles, templates, characters, audio, and plugins with 70/30 revenue split |
| **Cartoon Pro** | Stylized rendering in anime, watercolor, comic book, and 20+ additional styles |
| **Motion Capture** | Extract MoCap data from standard video input |
| **Desktop + Mobile** | Electron desktop wrapper and a React Native mobile app. The mobile app has no API client, so its studio and review screens are read-only |
| **Live Streaming** | WebRTC signalling for interactive sessions. Signalling only: no SFU, and no TURN relay is configured, so peers behind symmetric NAT cannot connect |

---

## Architecture

AnimaForge is organized into **7 architecture zones**, each with a clear responsibility boundary:

| Zone | Components | Responsibility |
|------|------------|----------------|
| **1. Client Layer** | Next.js 14+ Web, React Native Mobile, Electron Desktop, Client SDK | UI, project management, timeline editor, 3D preview |
| **2. API Gateway** | Express + Kong, Auth (JWT/RBAC/OAuth/SSO), Rate Limiter | Unified routing, request validation, CORS, rate limiting (60/300/1000 req/min by tier) |
| **3. Orchestration** | Job Scheduler, Model Router, WebSocket Hub | Job coordination, AI model routing, real-time state sync |
| **4. Generation** | Video, Audio, Avatar, Style, Script, Music, Dubbing, MoCap, Physics, Cartoon Pro | Specialized AI inference services for all content types |
| **5. Post-Processing** | Stabilizer, Upscaler, Interpolator, Compositor | Quality enhancement, temporal smoothing, format conversion |
| **6. Governance** | Content Moderator, C2PA Signer, Watermark Engine, Consent Validator | Mandatory pipeline -- every output passes all 4 stages before delivery |
| **7. Delivery** | CDN/CloudFront, S3/R2 Storage, Export Engine, Analytics, Social Distribution | Output packaging, hosting, metrics collection, multi-platform distribution |

Data flows top-down from Client to Delivery. WebSocket connections provide real-time feedback from Orchestration back to Clients.

Kafka carries the generation and governance events: `services/workers` publishes
the full job lifecycle to `animaforge.generation.v1` and
`animaforge.governance.v1`. **No service subscribes to them yet** — the consumer
side of `packages/events` is implemented and tested, but nothing is listening in
production, so events do not currently propagate state anywhere.

---

## Quick Start

### Prerequisites

- **Node.js** 20+ (LTS)
- **Python** 3.11+
- **Docker Desktop** 4.25+
- **Git** 2.40+

### One-Command Setup

```bash
git clone https://github.com/navigreen311/animaforge.git
cd animaforge

# Install deps, start infrastructure, run migrations, seed data
make setup

# Start all development services
make dev
```

This starts:

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| Platform API | http://localhost:3001 |
| AI Inference API | http://localhost:8001 |
| WebSocket Hub | ws://localhost:3002 |
| API Gateway | http://localhost:4000 |

### Manual Setup

```bash
# 1. Start infrastructure (Postgres, Redis, Elasticsearch, MinIO)
docker-compose -f docker/docker-compose.yml up -d

# 2. Install dependencies
npm install
cd services/ai-api && pip install -r requirements.txt && cd ../..

# 3. Configure environment
cp .env.example .env    # edit with your API keys and secrets

# 4. Database setup
npm run db:migrate
npm run db:seed          # optional: populate with sample data

# 5. Launch all services
npm run dev:all
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query. WebGL rendering is hand-rolled in `components/timeline/WebGLRenderer.tsx` — three.js is **not** a dependency |
| **Mobile** | React Native 0.73.6, Expo 50, React Navigation |
| **Desktop** | Electron 30+, electron-builder, auto-update |
| **Platform API** | Node.js + Express + TypeScript |
| **AI API** | FastAPI + Python 3.11 |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache / Queue** | Redis 7 + BullMQ |
| **Event Bus** | Apache Kafka (kafkajs) — producer wired, no consumer yet |
| **Search** | Elasticsearch 8.13 |
| **Real-time** | Socket.IO + Yjs CRDT |
| **Object Storage** | S3 / Cloudflare R2 / MinIO (dev) |
| **Video Export** | FFmpeg (H.264, H.265, VP9, AV1, ProRes) |
| **Auth** | JWT + RBAC + OAuth (Google, GitHub) + SSO/SAML + SCIM |
| **Testing** | Vitest, Pytest, Playwright, Supertest |
| **CI/CD** | GitHub Actions. ArgoCD is referenced in the deployment docs but nothing in this repo installs or configures it |
| **Infrastructure** | Docker, Kubernetes, Terraform (`infra/terraform`, validated but never applied) |

---

## Services

**18 service directories under `services/`.** Twelve of them build a container
image; the rest run in-process or are not containerised yet. Entries 19-22 below
are Python modules inside the AI API, not separate services — they are listed
because they are distinct capabilities, not because they are separately
deployable.

| # | Service | Stack | Port | Description |
|---|---------|-------|------|-------------|
| 1 | **Gateway** | Express + Kong | 4000 | API routing, rate limiting, request validation, CORS |
| 2 | **Platform API** | Node.js + Express + TS | 3001 | Projects, shots, characters, assets, reviews, CRUD |
| 3 | **AI API** | FastAPI + Python | 8001 | Video generation, audio synthesis, avatar, style, script inference |
| 4 | **Auth** | Node.js + Express | 3003 | JWT, RBAC, OAuth (Google/GitHub), SSO/SAML, SCIM provisioning |
| 5 | **Realtime** | Socket.IO + Node.js | 3002 | WebSocket hub for collaboration, progress, and presence |
| 6 | **Billing** | Node.js + Stripe | 3004 | Subscriptions, credit packs, usage metering, invoicing |
| 7 | **Governance** | Node.js + Python | 3005 | C2PA signing, content moderation, watermarking, consent validation |
| 8 | **Workers** | BullMQ + Celery | -- | Background job processing for long-running tasks |
| 9 | **Storage** | Node.js | 3006 | S3/R2 abstraction layer, pre-signed URLs, CDN integration |
| 10 | **Search** | Node.js + Elasticsearch | 3007 | Full-text and vector search across all entities |
| 11 | **Notification** | Node.js | 3008 | Email, push notifications, in-app notifications |
| 12 | **Analytics** | Node.js + ClickHouse | 3009 | Usage metrics, quality scores, billing events, dashboards |
| 13 | **Export** | Node.js + FFmpeg | 3010 | MP4, WebM, ProRes, image sequence export with codec options |
| 14 | **Collab** | Node.js + Yjs | 3012 | Real-time collaboration, presence indicators, threaded comments |
| 15 | **Marketplace** | Node.js + Express | 3012 | Community marketplace for styles, templates, plugins (70/30 split) |
| 16 | **Live** | Node.js + WebRTC | 3015 | Live streaming for interactive animation sessions |
| 17 | **Talent** | Node.js | 3014 | Voice actor and performer management, consent tracking |
| 18 | **Piracy** | Node.js + Python | 3016 | Content fingerprinting, similarity detection, DMCA takedowns |
| 19 | *Physics* | AI API module | -- | PBD cloth, hair, rigid body, and fluid simulation |
| 20 | *Training* | AI API module | -- | Custom model fine-tuning and LoRA training |
| 21 | *Cartoon Pro* | AI API module | -- | Stylized cartoon rendering (anime, watercolor, comic, 20+ styles) |
| 22 | *MoCap* | AI API module | -- | Motion capture extraction from video input |

> Roughly **340 route handlers** across the Node services and the AI API, plus
> **128 route files** under `apps/web/src/app/api`. Those 128 are Next.js routes
> serving fixed sample data, not a persistence layer — see **Project status**.

---

## API

AnimaForge exposes a comprehensive REST API across three base URLs:

| Endpoint | Base URL |
|----------|----------|
| Platform API | `https://api.animaforge.ai/v1` |
| AI Inference API | `https://ai.animaforge.ai/v1` |
| WebSocket | `wss://ws.animaforge.ai` |

All requests require a Bearer token in the `Authorization` header. Rate limits apply per subscription tier:

| Tier | Rate Limit |
|------|------------|
| Starter | 60 req/min |
| Pro | 300 req/min |
| Enterprise | 1,000 req/min |

Full endpoint documentation: [API Reference](docs/api-reference.md) | [OpenAPI Spec](services/platform-api/src/openapi.yaml)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture, 7 zones, pipelines, data flow diagrams |
| [API Reference](docs/api-reference.md) | Endpoint reference with request/response examples |
| [OpenAPI Spec](services/platform-api/src/openapi.yaml) | Machine-readable OpenAPI 3.1 specification |
| [Governance Pipeline](docs/governance-pipeline.md) | 4-stage mandatory pipeline: moderation, consent, C2PA, watermark |
| [Style Intelligence](docs/style-intelligence.md) | Style fingerprinting and transfer engine (X6) |
| [Avatar Studio](docs/avatar-studio.md) | 7-step 3D avatar reconstruction pipeline (X5) |
| [Timeline Editor](docs/timeline-editor.md) | Real-time collaborative timeline editing at 60fps |
| [Database](docs/database.md) | Prisma schema, migrations, pgvector, and data model |
| [Deployment](docs/deployment.md) | Kubernetes, Docker, CI/CD, and infrastructure guide |
| [Marketplace](docs/marketplace.md) | Community marketplace for assets, plugins, and revenue sharing |
| [Live Streaming](docs/live-runtime.md) | Real-time interactive animation sessions via WebRTC |
| [Plugin System](docs/plugins.md) | Plugin development, permissions, sandboxing, and distribution |
| [Mobile App](docs/mobile.md) | React Native architecture, offline support, and features |
| [Desktop App](docs/desktop.md) | Electron architecture, native integrations, and auto-update |
| [Security](docs/security.md) | Auth, encryption, compliance, audit logging, and threat model |
| [Testing](docs/testing.md) | Test strategy, coverage targets, frameworks, and CI integration |
| [Contributing](docs/contributing.md) | Development setup, conventions, branching model, and PR process |
| [WebRTC Live Runtime](docs/webrtc-live-runtime.md) | Signalling protocol, client sketch, and why TURN is not optional |
| [Event Bus](packages/events/README.md) | Kafka topics, event schemas, and the in-process fallback |
| [Infrastructure](infra/terraform/README.md) | Terraform layout, design decisions, and what is not covered |
| [Accessibility](docs/accessibility.md) | Audit findings and remediation |
| [Piracy](docs/piracy.md) | Fingerprinting, similarity detection, and DMCA workflow |
| [Disaster Recovery](docs/disaster-recovery.md) | Backup, restore, and failover procedures |

---

## Development Commands

### Services

```bash
make dev                  # Start all services concurrently
npm run dev:web           # Next.js frontend           :3000
npm run dev:api           # Platform API                :3001
npm run dev:ai            # AI API (FastAPI)            :8001
npm run dev:realtime      # WebSocket hub               :3002
npm run dev:all           # All services via concurrently
```

### Infrastructure

```bash
make infra                # Start Postgres, Redis, Elasticsearch, MinIO
make infra-down           # Stop infrastructure containers
npm run docker:up         # Start infra (npm alias)
npm run docker:down       # Stop infra (npm alias)
```

### Database

```bash
make db-migrate           # Run Prisma migrations
make db-seed              # Seed development data
make db-studio            # Open Prisma Studio GUI
make db-reset             # Reset database (destructive)
npm run db:migrate        # Run migrations (npm alias)
npm run db:seed           # Seed data (npm alias)
```

### Testing

```bash
make test                 # Run all tests (unit + integration + e2e)
npm run test              # Unit + integration tests
npm run test:e2e          # Playwright end-to-end tests
npm run lint              # ESLint across all packages
npm run format            # Prettier formatting
```

### Build & Clean

```bash
make build                # Build web app and TypeScript services
make clean                # Remove all node_modules and build artifacts
```

---

## Testing

AnimaForge follows the test pyramid with fast unit tests as the foundation.

**What exists today:**

| Layer | Tool | Files | Status |
|-------|------|-------|--------|
| **Unit** | Vitest | 14 files, 216 tests in `tests/unit` | passing, blocks merge |
| **Governance / piracy** | Vitest | `services/governance`, `services/piracy`, `tests/integration/governance.test.ts` | passing, blocks merge |
| **Integration** | Vitest + Supertest | 9 files in `tests/integration` | not run by CI |
| **Service suites** | Vitest | e.g. `services/platform-api` (117 tests) | 35 failing — [#21](https://github.com/navigreen311/animaforge/issues/21) |
| **AI API** | Pytest | 35 files, 280 tests | 11 failing — [#23](https://github.com/navigreen311/animaforge/issues/23) |
| **E2E** | Playwright | 5 specs in `tests/e2e` | never verified green — [#21](https://github.com/navigreen311/animaforge/issues/21) |

The original targets for this pyramid were ~1,500 unit, ~300 integration and ~50
E2E tests. Those remain goals, not measurements.

### Coverage

Coverage is collected (`@vitest/coverage-v8`) and uploaded as a CI artifact.

**No thresholds are enforced.** Nothing in `vitest.config.ts` or the workflows
sets a `coverage.thresholds` block, so a build cannot fail on a coverage drop.
An earlier version of this README stated the opposite. The intended minimums —
80% for service logic, 90% for the governance pipeline and utilities, 75% for
API routes, 60% for frontend components — are recorded here as the target to
configure, not as a gate that exists.

---

## Deployment

### Docker Compose (Development)

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Infrastructure containers: PostgreSQL 16 (pgvector), Redis 7, Elasticsearch 8.13,
MinIO (S3-compatible), and Kafka in KRaft mode.

```bash
# Kafka alone, with its topics created
docker compose -f docker/docker-compose.yml up kafka kafka-init
```

`kafka-init` creates `animaforge.generation.v1` and `animaforge.governance.v1`
with reviewed partition counts and retention, then exits. Broker auto-creation
is deliberately off. Reach the broker at `localhost:9092` from the host and
`kafka:29092` from inside compose.

### Docker Compose (Full Stack)

```bash
make docker-up            # Build and start all services + infrastructure
make docker-down          # Stop and remove volumes
```

### Infrastructure (Terraform)

`infra/terraform` provisions the AWS estate the manifests in `k8s/` target: a
VPC across three subnet tiers, EKS, RDS PostgreSQL 16 with pgvector,
ElastiCache Redis, S3 buckets and CloudFront.

```bash
terraform -chdir=infra/terraform init -backend=false
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan -var-file=environments/production.tfvars
```

**It has never been applied.** There is no AWS account attached to this
repository, so nothing here has been through a real `plan` or `apply` — expect
quota limits and IAM edge cases on first contact. CI validates the root and each
module in isolation on every PR. Kafka (MSK), Elasticsearch, Route 53/ACM and
the state backend itself are deliberately out of scope; see
`infra/terraform/README.md`.

### Kubernetes (Production)

The intended pipeline is:

```
Push to main --> GitHub Actions CI --> Docker Build --> Container Registry --> ArgoCD Sync --> Kubernetes
```

`deploy-staging.yml` and `deploy-production.yml` implement the build-and-deploy
steps. **ArgoCD is not installed or configured by anything in this repository** —
the sync step above is a description of intent, not of a running system.

Twelve of the eighteen services build a container image. Three of the five
images the security workflow scans currently fail to build
([#20](https://github.com/navigreen311/animaforge/issues/20)).

See [Deployment Guide](docs/deployment.md) for Kubernetes manifests and runbooks.

---

## Project Structure

```
animaforge/
  apps/
    web/                  # Next.js 14 frontend
    mobile/               # React Native (Expo) app — no API client yet
    desktop/              # Electron wrapper
  services/
    platform-api/         # Node.js Express API (projects, shots, assets)
    ai-api/               # FastAPI AI inference (video, audio, avatar, style)
    auth/                 # Authentication + OAuth + SSO
    realtime/             # Socket.IO WebSocket hub
    billing/              # Stripe billing + credit system
    governance/           # C2PA, moderation, watermark, consent
    workers/              # BullMQ / Celery background workers
    gateway/              # API Gateway (Express + Kong)
    storage/              # S3/R2 storage abstraction
    search/               # Elasticsearch search service
    notification/         # Email, push, in-app notifications
    analytics/            # Usage metrics + ClickHouse
    export/               # FFmpeg video export
    collab/               # Real-time collaboration + Yjs
    marketplace/          # Community marketplace
    live/                 # Live streaming (WebRTC)
    talent/               # Talent management + consent
    piracy/               # Content fingerprinting + takedowns
  packages/
    shared/               # Shared types, constants, utilities
    db/                   # Prisma schema & migrations
    events/               # Kafka topics, event schemas, producer/consumer
    logger/               # Structured logging, metrics, health checks
    storage/              # Storage helpers
    sdk/                  # Client SDK for third-party integrations
  infra/
    terraform/            # AWS: VPC, EKS, RDS, ElastiCache, S3 + CloudFront
  k8s/                    # Kubernetes manifests
  docker/                 # Docker Compose configurations
  docs/                   # Feature documentation (21 docs)
  tests/                  # unit, integration, e2e, load
  scripts/                # Automation and deployment scripts
  .github/workflows/      # CI/CD pipelines
```

---

## Contributing

We welcome contributions. Please read the full [Contributing Guide](docs/contributing.md) before submitting a PR.

### Quick Summary

1. Fork the repository
2. Create a feature branch from `develop`: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Run `make test` and `npm run lint` to verify
5. Submit a PR against `develop`

### Branch Naming

```
feature/*       # New features
fix/*           # Bug fixes
docs/*          # Documentation
refactor/*      # Code refactoring
ai-feature/*    # AI-assisted feature development
```

---

## License

**Proprietary** -- Green Companies LLC. All rights reserved.

See [LICENSE](LICENSE) for terms.

---

<div align="center">

Built with care by **Green Companies LLC**

[Website](https://animaforge.ai) | [Documentation](docs/) | [API Reference](docs/api-reference.md) | [Contributing](docs/contributing.md)

</div>
