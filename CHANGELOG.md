# Changelog

All notable changes to AnimaForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.0] — 2026-03-25

### Added
- SQL migration for all 18 database tables with foreign keys and indexes
- Two-tier caching layer (LRU L1 + Redis L2 fallback)
- FFmpeg encoder service with codec map, thumbnail generation, and graceful fallback
- Google + GitHub OAuth service with authorization, token exchange, and user provisioning
- OAuth Express routes (redirect, callback, provider listing)
- Accessibility utilities: focus trapping, screen reader announcements, reduced motion detection, WCAG contrast checking
- SkipLink, LiveRegion, and VisuallyHidden UI components
- Professional README with full architecture documentation
- This CHANGELOG covering all five development waves

## [0.4.0] — 2026-03-25

### Added
- Marketplace service with listings, purchases, and reviews
- Live streaming runtime with WebRTC support
- Talent management service for voice actors and performers
- Anti-piracy service with content fingerprinting and takedown workflows
- Plugin system architecture with permissions and sandboxing
- Social publishing integrations (YouTube, TikTok, Instagram)
- Content repurposing engine (vertical shorts, square social, GIFs, thumbnails)
- Mobile app scaffold (React Native + NativeWind)
- Desktop app scaffold (Electron 30+)

## [0.3.0] — 2026-03-25

### Added
- Governance pipeline: C2PA signing, content moderation, watermarking, consent validation
- Storage service with S3/R2 abstraction and pre-signed URLs
- Search service powered by Elasticsearch
- Notification service (email, push, in-app)
- Analytics service with ClickHouse integration
- Export service for MP4, WebM, ProRes, and image sequences
- Collaboration service with real-time presence and comments
- Billing service with Stripe subscriptions and credit metering
- SSO/SAML and SCIM provisioning for enterprise auth

## [0.2.0] — 2026-03-25

### Added
- AI API (FastAPI) with video generation, audio, avatar, style, and script modules
- Physics simulation sub-service (cloth, hair, rigid body, fluid, particles)
- Custom model training pipeline
- Cartoon Pro stylized rendering engine
- Motion capture extraction from video
- Music and SFX AI composition
- Multilingual dubbing pipeline
- Real-time WebSocket hub (Socket.IO) for collaboration and job progress
- Shared types, constants, error classes, and logging utilities

## [0.1.0] — 2026-03-25

### Added
- Monorepo scaffold with npm workspaces (apps, services, packages)
- Prisma database schema covering all 7 entity groups (18 tables)
- Platform API (Node.js + Express + TypeScript) with full CRUD endpoints
- API Gateway service (Express + Kong)
- Auth service with JWT, RBAC, and refresh tokens
- Docker Compose for local development (PostgreSQL, Redis, Kafka, Elasticsearch)
- CI/CD workflow (GitHub Actions)
- CLAUDE.md for AI-assisted development
- ESLint, Prettier, Vitest, and Playwright configuration
- Project documentation suite (architecture, API reference, governance, deployment)
