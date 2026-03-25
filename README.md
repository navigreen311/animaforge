# AnimaForge

**The World's First Full-Stack AI Animation & Video Production Operating System**

Built by Green Companies LLC | Blueprint v1.0

## Overview

AnimaForge is a distributed production operating system for AI-powered animation and video creation. It orchestrates specialized services through a central API gateway, sharing a common data layer, event bus, and governance pipeline.

### Architecture Zones

| Zone | Components | Responsibility |
|------|-----------|----------------|
| Client Layer | Next.js Web App, React Native Mobile, Electron Desktop | UI, project management, timeline editor |
| API Gateway | Express + Kong | Auth, routing, rate limiting |
| Orchestration | Job Scheduler, Model Router, WebSocket Hub | Job coordination, model routing, real-time state |
| Generation | Video Diffusion, Audio, Avatar, Style, Script, Music, Dubbing, MoCap, Physics, Cartoon Pro | Specialized AI inference services |
| Post-Processing | Stabilizer, Upscaler, Interpolator, Compositor | Quality enhancement, format conversion |
| Governance | Content Mod, C2PA, Watermark, Consent, Human Review | Mandatory pipeline — every output |
| Delivery | CDN, S3, Export, Analytics, Social, Repurpose | Output packaging, hosting, telemetry, distribution |

## Services (22)

| # | Service | Stack | Port | Description |
|---|---------|-------|------|-------------|
| 1 | **Gateway** | Express + Kong | 4000 | API routing, rate limiting, auth |
| 2 | **Platform API** | Node.js + Express + TS | 3001 | Projects, shots, characters, assets, reviews |
| 3 | **AI API** | FastAPI + Python | 8001 | Video generation, audio, avatar, style, script |
| 4 | **Auth** | Node.js + Express | 3003 | JWT, RBAC, SSO/SAML, SCIM |
| 5 | **Realtime** | Socket.IO + Node.js | 3002 | WebSocket hub for collaboration and progress |
| 6 | **Billing** | Node.js + Stripe | 3004 | Subscriptions, credits, invoicing |
| 7 | **Governance** | Node.js + Python | 3005 | C2PA, moderation, watermark, consent |
| 8 | **Workers** | BullMQ + Celery | - | Background job processing |
| 9 | **Storage** | Node.js | 3006 | S3/R2 abstraction, pre-signed URLs |
| 10 | **Search** | Node.js + Elasticsearch | 3007 | Full-text search across all entities |
| 11 | **Notification** | Node.js | 3008 | Email, push, in-app notifications |
| 12 | **Analytics** | Node.js + ClickHouse | 3009 | Usage metrics, quality scores, billing events |
| 13 | **Export** | Node.js + FFmpeg | 3010 | MP4, WebM, ProRes, image sequence export |
| 14 | **Collab** | Node.js | 3011 | Real-time collaboration, presence, comments |
| 15 | **Marketplace** | Node.js + Express | 3012 | Community marketplace for styles, templates, plugins |
| 16 | **Live** | Node.js + WebRTC | 3013 | Live streaming runtime for interactive sessions |
| 17 | **Talent** | Node.js | 3014 | Voice actor and performer management |
| 18 | **Piracy** | Node.js + Python | 3015 | Content fingerprinting and takedown management |

### AI Sub-Services (within AI API)

| # | Module | Description |
|---|--------|-------------|
| 19 | **Physics** | Cloth, hair, rigid body, fluid, and particle simulation |
| 20 | **Training** | Custom model fine-tuning on user datasets |
| 21 | **Cartoon Pro** | Stylized cartoon rendering (anime, watercolor, comic, etc.) |
| 22 | **MoCap** | Motion capture extraction from video |

## Client Applications

| App | Technology | Platforms |
|-----|-----------|-----------|
| **Web App** | Next.js 14+, TypeScript, Tailwind, Radix UI | All modern browsers |
| **Mobile App** | React Native, NativeWind, Zustand | iOS 16+, Android 9+ |
| **Desktop App** | Electron 30+, same Next.js renderer | Windows 10+, macOS 12+, Linux |

See [docs/mobile.md](docs/mobile.md) and [docs/desktop.md](docs/desktop.md) for architecture details.

## Key Features

- **AI Video Generation** — Text-to-video with style consistency and character identity
- **Avatar Studio** — 7-step 3D avatar reconstruction from reference images
- **Style Intelligence** — Style fingerprinting and transfer across shots
- **Script AI** — Script parsing, shot decomposition, and prompt generation
- **Music & Audio** — AI music composition, SFX generation, multilingual dubbing
- **Physics Simulation** — Cloth, hair, fluid, and particle physics for animations
- **Motion Capture** — Extract MoCap data from video input
- **Cartoon Pro** — Stylized rendering in anime, watercolor, comic book, and more
- **Custom Training** — Fine-tune models on your own datasets
- **Governance Pipeline** — Content moderation, C2PA signing, watermarking, consent validation
- **Marketplace** — Buy and sell style packs, templates, characters, audio packs, and plugins
- **Live Streaming** — Real-time interactive animation sessions with viewer participation
- **Plugin System** — Extensible architecture with third-party plugins
- **Social Publishing** — Direct publishing to YouTube, TikTok, Instagram, and more
- **Content Repurposing** — Auto-convert to vertical shorts, square social, GIFs, and thumbnails
- **Real-time Collaboration** — Multi-user timeline editing with presence and comments
- **Enterprise** — SSO/SCIM, RBAC, audit logs, brand kits, custom domains

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query, Three.js
- **Mobile**: React Native 0.74+, NativeWind, MMKV, React Navigation
- **Desktop**: Electron 30+, electron-builder, auto-update
- **Platform API**: Node.js + Express + TypeScript
- **AI API**: FastAPI + Python 3.11
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis + BullMQ
- **Event Bus**: Apache Kafka
- **Search**: Elasticsearch 8
- **Real-time**: Socket.IO
- **Testing**: Vitest, Pytest, Playwright
- **CI/CD**: GitHub Actions, ArgoCD

## Quick Start

```bash
# Clone
git clone https://github.com/navigreen311/animaforge.git
cd animaforge

# Start infrastructure (Postgres, Redis, Kafka, Elasticsearch)
docker-compose -f docker/docker-compose.yml up -d

# Install dependencies
npm install

# Install AI API dependencies
cd services/ai-api && pip install -r requirements.txt && cd ../..

# Setup environment
cp .env.example .env
# Edit .env with your values (database, Redis, API keys)

# Run database migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed

# Start all development servers
npm run dev:all
```

### Individual Services

```bash
npm run dev:web       # Next.js frontend on :3000
npm run dev:api       # Platform API on :3001
npm run dev:ai        # AI API on :8001
npm run dev:realtime  # WebSocket on :3002
npm run dev:gateway   # Gateway on :4000
npm run dev:all       # All services concurrently
```

## Project Structure

```
animaforge/
  apps/
    web/                        # Next.js frontend
    mobile/                     # React Native mobile app
    desktop/                    # Electron desktop app
  services/
    platform-api/               # Node.js Express API
    ai-api/                     # FastAPI AI inference
    realtime/                   # Socket.IO WebSocket hub
    auth/                       # Authentication service
    billing/                    # Stripe billing
    governance/                 # C2PA, moderation, watermark, consent
    workers/                    # BullMQ/Celery task workers
    gateway/                    # API Gateway
    storage/                    # S3/R2 storage abstraction
    search/                     # Elasticsearch search service
    notification/               # Notification service
    analytics/                  # Analytics and metrics
    export/                     # Video export engine
    collab/                     # Collaboration service
    marketplace/                # Community marketplace
    live/                       # Live streaming runtime
    talent/                     # Talent management
    piracy/                     # Anti-piracy service
  packages/
    shared/                     # Shared types & constants
    db/                         # Prisma schema & migrations
  docker/                       # Docker Compose configs
  docs/                         # Feature documentation
  scripts/                      # Automation scripts
```

## Testing

```bash
npm run test          # Unit + integration tests
npm run test:coverage # Tests with coverage report
npm run test:e2e      # Playwright end-to-end tests
npm run lint          # ESLint
npm run format        # Prettier
```

See [docs/testing.md](docs/testing.md) for the full testing strategy.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture, zones, pipelines, data flow |
| [API Reference](docs/api-reference.md) | All Platform and AI API endpoints with examples |
| [OpenAPI Spec](services/platform-api/src/openapi.yaml) | Machine-readable OpenAPI 3.1 specification |
| [Governance Pipeline](docs/governance-pipeline.md) | Content moderation, C2PA, watermarking, consent |
| [Style Intelligence](docs/style-intelligence.md) | Style fingerprinting and transfer engine |
| [Avatar Studio](docs/avatar-studio.md) | 3D avatar reconstruction pipeline |
| [Timeline Editor](docs/timeline-editor.md) | Real-time collaborative timeline editing |
| [Database](docs/database.md) | Schema, migrations, and data model |
| [Deployment](docs/deployment.md) | Kubernetes, CI/CD, and infrastructure |
| [Marketplace](docs/marketplace.md) | Community marketplace for assets and plugins |
| [Live Streaming](docs/live-runtime.md) | Real-time interactive animation sessions |
| [Plugin System](docs/plugins.md) | Plugin development, permissions, and distribution |
| [Mobile App](docs/mobile.md) | React Native architecture and features |
| [Desktop App](docs/desktop.md) | Electron architecture and native features |
| [Security](docs/security.md) | Auth, encryption, compliance, and audit |
| [Testing](docs/testing.md) | Test strategy, frameworks, and CI integration |
| [Contributing](docs/contributing.md) | Development setup, conventions, and PR process |

## License

Proprietary — Green Companies LLC
