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

[Quick Start](#quick-start) | [Architecture](#architecture) | [Services](#services-22) | [API](#api) | [Docs](#documentation) | [Contributing](#contributing)

</div>

---

## What is AnimaForge?

AnimaForge is a distributed production operating system that orchestrates **22 microservices** for AI-powered animation and video creation. It transforms text scripts and creative direction into fully rendered, provenance-tracked animated video within a single platform.

Every piece of AI-generated content passes through a **mandatory 4-stage governance pipeline** before delivery:

```
Generated Output --> Content Moderation --> Consent Validation --> C2PA Signing --> Watermarking --> Delivered
```

From script to publish-ready video -- one platform, one pipeline, full provenance.

---

## Key Features

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
| **Desktop + Mobile** | Electron desktop app with native features and React Native mobile app |
| **Live Streaming** | Real-time interactive animation sessions via WebRTC |

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

Data flows top-down from Client to Delivery. WebSocket connections provide real-time feedback from Orchestration back to Clients. Kafka events propagate state changes across all zones.

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
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query, Three.js |
| **Mobile** | React Native 0.74+, NativeWind, MMKV, React Navigation |
| **Desktop** | Electron 30+, electron-builder, auto-update |
| **Platform API** | Node.js + Express + TypeScript |
| **AI API** | FastAPI + Python 3.11 |
| **Database** | PostgreSQL 16 + pgvector |
| **Cache / Queue** | Redis 7 + BullMQ |
| **Event Bus** | Apache Kafka |
| **Search** | Elasticsearch 8.13 |
| **Real-time** | Socket.IO + Yjs CRDT |
| **Object Storage** | S3 / Cloudflare R2 / MinIO (dev) |
| **Video Export** | FFmpeg (H.264, H.265, VP9, AV1, ProRes) |
| **Auth** | JWT + RBAC + OAuth (Google, GitHub) + SSO/SAML + SCIM |
| **Testing** | Vitest, Pytest, Playwright, Supertest, Testcontainers |
| **CI/CD** | GitHub Actions, ArgoCD |
| **Infrastructure** | Docker, Kubernetes, Terraform |

---

## Services (22)

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
| 14 | **Collab** | Node.js + Yjs | 3011 | Real-time collaboration, presence indicators, threaded comments |
| 15 | **Marketplace** | Node.js + Express | 3012 | Community marketplace for styles, templates, plugins (70/30 split) |
| 16 | **Live** | Node.js + WebRTC | 3013 | Live streaming for interactive animation sessions |
| 17 | **Talent** | Node.js | 3014 | Voice actor and performer management, consent tracking |
| 18 | **Piracy** | Node.js + Python | 3015 | Content fingerprinting, similarity detection, DMCA takedowns |
| 19 | **Physics** | Python (AI API sub) | -- | PBD cloth, hair, rigid body, and fluid simulation |
| 20 | **Training** | Python (AI API sub) | -- | Custom model fine-tuning and LoRA training |
| 21 | **Cartoon Pro** | Python (AI API sub) | -- | Stylized cartoon rendering (anime, watercolor, comic, 20+ styles) |
| 22 | **MoCap** | Python (AI API sub) | -- | Motion capture extraction from video input |

> **~320 API endpoints** across Platform API, AI API, and auxiliary services.

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
| [API Reference](docs/api-reference.md) | All ~320 API endpoints with request/response examples |
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

AnimaForge follows the test pyramid with fast unit tests as the foundation:

| Layer | Tool | Count Target | Speed | Coverage Target |
|-------|------|-------------|-------|-----------------|
| **Unit** | Vitest + Pytest | ~1,500 tests (70%) | < 5 ms each | 80-90% |
| **Integration** | Vitest + Supertest + Pytest | ~300 tests (25%) | < 500 ms each | 75% |
| **E2E** | Playwright | ~50 tests (5%) | < 30 s each | Critical flows |

### Coverage Thresholds

| Area | Minimum |
|------|---------|
| Business logic (`services/`) | 80% |
| API routes (`controllers/`) | 75% |
| Utility functions (`utils/`) | 90% |
| Governance pipeline | 90% |
| Frontend components | 60% |

CI enforces these thresholds -- builds fail if coverage drops below the configured minimums.

---

## Deployment

### Docker Compose (Development)

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Infrastructure containers: PostgreSQL 16 (pgvector), Redis 7, Elasticsearch 8.13, MinIO (S3-compatible).

### Docker Compose (Full Stack)

```bash
make docker-up            # Build and start all services + infrastructure
make docker-down          # Stop and remove volumes
```

### Kubernetes (Production)

AnimaForge deploys to Kubernetes via ArgoCD with the following pipeline:

```
Push to main --> GitHub Actions CI --> Docker Build --> Container Registry --> ArgoCD Sync --> Kubernetes
```

Staging deploys automatically on merge to `develop`. Production deploys require approval on merge to `main`.

See [Deployment Guide](docs/deployment.md) for full Kubernetes manifests, Terraform configs, and runbooks.

---

## Project Structure

```
animaforge/
  apps/
    web/                  # Next.js 14+ frontend
    mobile/               # React Native mobile app
    desktop/              # Electron desktop app
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
    sdk/                  # Client SDK for third-party integrations
  docker/                 # Docker Compose configurations
  docs/                   # Feature documentation (17 docs)
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
