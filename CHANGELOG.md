# Changelog

All notable changes to AnimaForge are documented here.

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
