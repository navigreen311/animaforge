# AnimaForge

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.4-blue.svg)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/python-3.11-yellow.svg)](https://python.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/contributing.md)

---

## What is AnimaForge?

AnimaForge is the world's first full-stack AI animation and video production operating system. It orchestrates 22 specialized services through a central API gateway, sharing a common data layer, event bus, and governance pipeline — enabling teams to go from script to publish-ready video in a single platform.

Built by **Green Companies LLC**.

---

## Key Features

- **AI Video Generation** — Text-to-video with style consistency and character identity
- **Avatar Studio** — 7-step 3D avatar reconstruction from reference images
- **Style Intelligence** — Style fingerprinting and transfer across shots
- **Script AI** — Script parsing, shot decomposition, and prompt generation
- **Music & Audio** — AI music composition, SFX generation, multilingual dubbing
- **Physics Simulation** — Cloth, hair, fluid, and particle physics for animations
- **Motion Capture** — Extract MoCap data from video input
- **Cartoon Pro** — Stylized rendering in anime, watercolor, comic book, and more
- **Governance Pipeline** — Content moderation, C2PA signing, watermarking, consent
- **Real-time Collaboration** — Multi-user timeline editing with presence and comments
- **Marketplace** — Buy and sell style packs, templates, characters, audio, and plugins

---

## Architecture

| Zone | Components | Responsibility |
|------|-----------|----------------|
| **Client Layer** | Next.js Web, React Native Mobile, Electron Desktop | UI, project management, timeline editor |
| **API Gateway** | Express + Kong | Auth, routing, rate limiting |
| **Orchestration** | Job Scheduler, Model Router, WebSocket Hub | Job coordination, model routing, real-time state |
| **Generation** | Video, Audio, Avatar, Style, Script, Music, Dubbing, MoCap, Physics, Cartoon Pro | Specialized AI inference services |
| **Post-Processing** | Stabilizer, Upscaler, Interpolator, Compositor | Quality enhancement, format conversion |
| **Governance** | Content Mod, C2PA, Watermark, Consent, Human Review | Mandatory pipeline — every output |
| **Delivery** | CDN, S3, Export, Analytics, Social, Repurpose | Output packaging, hosting, distribution |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/navigreen311/animaforge.git
cd animaforge

# One-command setup (installs deps, copies .env, builds packages)
make setup

# Start all development services
make dev
```

Or step-by-step:

```bash
# Start infrastructure
docker-compose -f docker/docker-compose.yml up -d

# Install dependencies
npm install
cd services/ai-api && pip install -r requirements.txt && cd ../..

# Environment
cp .env.example .env   # edit with your values

# Database
npm run db:migrate
npm run db:seed         # optional

# Launch
npm run dev:all
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query, Three.js |
| Mobile | React Native 0.74+, NativeWind, MMKV, React Navigation |
| Desktop | Electron 30+, electron-builder, auto-update |
| Platform API | Node.js + Express + TypeScript |
| AI API | FastAPI + Python 3.11 |
| Database | PostgreSQL 16 + pgvector |
| Cache / Queue | Redis + BullMQ |
| Event Bus | Apache Kafka |
| Search | Elasticsearch 8 |
| Real-time | Socket.IO |
| Video Export | FFmpeg (H.264, H.265, VP9, AV1) |
| Auth | JWT + RBAC + OAuth (Google, GitHub) + SSO/SAML + SCIM |
| Testing | Vitest, Pytest, Playwright |
| CI/CD | GitHub Actions, ArgoCD |

---

## Project Structure

```
animaforge/
  apps/
    web/                  # Next.js frontend
    mobile/               # React Native mobile app
    desktop/              # Electron desktop app
  services/
    platform-api/         # Node.js Express API
    ai-api/               # FastAPI AI inference
    auth/                 # Authentication + OAuth
    realtime/             # Socket.IO WebSocket hub
    billing/              # Stripe billing
    governance/           # C2PA, moderation, watermark, consent
    workers/              # BullMQ / Celery task workers
    gateway/              # API Gateway
    storage/              # S3/R2 storage abstraction
    search/               # Elasticsearch search
    notification/         # Notification service
    analytics/            # Analytics and metrics
    export/               # FFmpeg video export
    collab/               # Collaboration service
    marketplace/          # Community marketplace
    live/                 # Live streaming runtime
    talent/               # Talent management
    piracy/               # Anti-piracy service
  packages/
    shared/               # Shared types, constants, cache
    db/                   # Prisma schema & migrations
  docker/                 # Docker Compose configs
  docs/                   # Feature documentation
  scripts/                # Automation scripts
```

---

## Services (22)

| # | Service | Stack | Port | Description |
|---|---------|-------|------|-------------|
| 1 | **Gateway** | Express + Kong | 4000 | API routing, rate limiting, auth |
| 2 | **Platform API** | Node.js + Express + TS | 3001 | Projects, shots, characters, assets, reviews |
| 3 | **AI API** | FastAPI + Python | 8001 | Video generation, audio, avatar, style, script |
| 4 | **Auth** | Node.js + Express | 3003 | JWT, RBAC, OAuth, SSO/SAML, SCIM |
| 5 | **Realtime** | Socket.IO + Node.js | 3002 | WebSocket hub for collaboration and progress |
| 6 | **Billing** | Node.js + Stripe | 3004 | Subscriptions, credits, invoicing |
| 7 | **Governance** | Node.js + Python | 3005 | C2PA, moderation, watermark, consent |
| 8 | **Workers** | BullMQ + Celery | — | Background job processing |
| 9 | **Storage** | Node.js | 3006 | S3/R2 abstraction, pre-signed URLs |
| 10 | **Search** | Node.js + Elasticsearch | 3007 | Full-text search across all entities |
| 11 | **Notification** | Node.js | 3008 | Email, push, in-app notifications |
| 12 | **Analytics** | Node.js + ClickHouse | 3009 | Usage metrics, quality scores, billing events |
| 13 | **Export** | Node.js + FFmpeg | 3010 | MP4, WebM, ProRes, image sequence export |
| 14 | **Collab** | Node.js | 3011 | Real-time collaboration, presence, comments |
| 15 | **Marketplace** | Node.js + Express | 3012 | Community marketplace for styles and plugins |
| 16 | **Live** | Node.js + WebRTC | 3013 | Live streaming for interactive sessions |
| 17 | **Talent** | Node.js | 3014 | Voice actor and performer management |
| 18 | **Piracy** | Node.js + Python | 3015 | Content fingerprinting and takedowns |
| 19 | **Physics** | Python (AI API sub) | — | Cloth, hair, rigid body, fluid simulation |
| 20 | **Training** | Python (AI API sub) | — | Custom model fine-tuning |
| 21 | **Cartoon Pro** | Python (AI API sub) | — | Stylized cartoon rendering |
| 22 | **MoCap** | Python (AI API sub) | — | Motion capture extraction |

> **~320 API endpoints** across Platform API, AI API, and auxiliary services.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture, zones, pipelines, data flow |
| [API Reference](docs/api-reference.md) | All API endpoints with examples |
| [OpenAPI Spec](services/platform-api/src/openapi.yaml) | Machine-readable OpenAPI 3.1 specification |
| [Governance Pipeline](docs/governance-pipeline.md) | Content moderation, C2PA, watermarking, consent |
| [Style Intelligence](docs/style-intelligence.md) | Style fingerprinting and transfer engine |
| [Avatar Studio](docs/avatar-studio.md) | 3D avatar reconstruction pipeline |
| [Timeline Editor](docs/timeline-editor.md) | Real-time collaborative timeline editing |
| [Database](docs/database.md) | Schema, migrations, and data model |
| [Deployment](docs/deployment.md) | Kubernetes, CI/CD, and infrastructure |
| [Marketplace](docs/marketplace.md) | Community marketplace for assets and plugins |
| [Live Streaming](docs/live-runtime.md) | Real-time interactive animation sessions |
| [Plugin System](docs/plugins.md) | Plugin development, permissions, distribution |
| [Mobile App](docs/mobile.md) | React Native architecture and features |
| [Desktop App](docs/desktop.md) | Electron architecture and native features |
| [Security](docs/security.md) | Auth, encryption, compliance, and audit |
| [Testing](docs/testing.md) | Test strategy, frameworks, and CI integration |
| [Contributing](docs/contributing.md) | Development setup, conventions, and PR process |

---

## Development Commands

```bash
npm run dev:web           # Next.js frontend on :3000
npm run dev:api           # Platform API on :3001
npm run dev:ai            # AI API on :8001
npm run dev:realtime      # WebSocket hub on :3002
npm run dev:all           # All services concurrently

npm run test              # Unit + integration tests
npm run test:e2e          # Playwright end-to-end tests
npm run lint              # ESLint
npm run format            # Prettier

npm run db:migrate        # Run Prisma migrations
npm run db:seed           # Seed development data

npm run docker:up         # Start infrastructure containers
npm run docker:down       # Stop infrastructure containers
```

---

## License

Proprietary — Green Companies LLC
