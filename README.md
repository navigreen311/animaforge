# AnimaForge

**The World's First Full-Stack AI Animation & Video Production Operating System**

Built by Green Companies LLC | Blueprint v1.0

## Overview

AnimaForge is a distributed production operating system for AI-powered animation and video creation. It orchestrates specialized services through a central API gateway, sharing a common data layer, event bus, and governance pipeline.

### Architecture Zones

| Zone | Components | Responsibility |
|------|-----------|----------------|
| Client Layer | Next.js Web App | UI, project management, timeline editor |
| API Gateway | Express + Kong | Auth, routing, rate limiting |
| Orchestration | Job Scheduler, Model Router, WebSocket Hub | Job coordination, model routing, real-time state |
| Generation | Video Diffusion, Audio, Avatar, Style, Script AI | Specialized AI inference services |
| Post-Processing | Stabilizer, Upscaler, Interpolator | Quality enhancement, format conversion |
| Governance | Content Mod, C2PA, Watermark, Consent | Mandatory pipeline — every output |
| Delivery | CDN, S3, Export, Analytics | Output packaging, hosting, telemetry |

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query, Three.js
- **Platform API**: Node.js + Express + TypeScript
- **AI API**: FastAPI + Python 3.11
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.IO
- **Testing**: Vitest, Pytest, Playwright

## Quick Start

```bash
# Clone
git clone https://github.com/navigreen311/animaforge.git
cd animaforge

# Start infrastructure
docker-compose -f docker/docker-compose.yml up -d

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev:all
```

## Project Structure

```
animaforge/
├── apps/web/                    # Next.js frontend
├── services/
│   ├── platform-api/            # Node.js Express API
│   ├── ai-api/                  # FastAPI AI inference
│   ├── realtime/                # Socket.IO WebSocket hub
│   ├── auth/                    # Authentication service
│   ├── billing/                 # Stripe billing
│   ├── governance/              # C2PA, moderation, watermark, consent
│   └── workers/                 # BullMQ/Celery task workers
├── packages/
│   ├── shared/                  # Shared types & constants
│   └── db/                      # Prisma schema & migrations
├── docker/                      # Docker Compose configs
├── docs/                        # Feature documentation
└── scripts/                     # Automation scripts
```

## Development

```bash
npm run dev:web       # Next.js frontend on :3000
npm run dev:api       # Platform API on :3001
npm run dev:ai        # AI API on :8001
npm run dev:realtime  # WebSocket on :3002
npm run dev:all       # All services concurrently
```

## Testing

```bash
npm run test          # Unit + integration tests
npm run test:e2e      # Playwright end-to-end tests
npm run lint          # ESLint
npm run format        # Prettier
```

## License

Proprietary — Green Companies LLC
