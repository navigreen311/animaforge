# AnimaForge Deployment Guide

## Local Development Setup

### Prerequisites

- **Node.js** 20+ (LTS)
- **Python** 3.11+
- **Docker Desktop** 4.25+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Git** 2.40+

### Clone & Install

```bash
git clone https://github.com/animaforge/animaforge.git
cd animaforge
pnpm install
```

### Environment Configuration

Copy the example environment file and fill in required values:

```bash
cp .env.example .env.local
```

### Start Development Services

```bash
# Start infrastructure (Postgres, Redis, Kafka, Elasticsearch)
docker compose up -d

# Run database migrations
pnpm db:migrate

# Seed development data
pnpm db:seed

# Start all services in development mode
pnpm dev
```

This starts:
- **Web App**: http://localhost:3000
- **Platform API**: http://localhost:4000
- **AI Inference API**: http://localhost:8000
- **WebSocket Server**: ws://localhost:4001
- **Storybook**: http://localhost:6006

---

## Docker Compose Usage

### Full Stack (Development)

```bash
docker compose up -d
```

Services started:
| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 16 + pgvector |
| `redis` | 6379 | Redis 7 (cache + queues) |
| `kafka` | 9092 | Apache Kafka (event bus) |
| `zookeeper` | 2181 | Kafka coordination |
| `elasticsearch` | 9200 | Elasticsearch 8 (search) |
| `minio` | 9000 | S3-compatible object storage |

### Selective Services

```bash
# Only database and cache
docker compose up postgres redis -d

# Add Kafka for event-driven features
docker compose up postgres redis kafka zookeeper -d
```

### Reset Development Data

```bash
docker compose down -v   # Remove volumes
docker compose up -d     # Fresh start
pnpm db:migrate
pnpm db:seed
```

### View Logs

```bash
docker compose logs -f postgres
docker compose logs -f --tail=100  # All services, last 100 lines
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/animaforge` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `AUTH_SECRET` | JWT signing secret (min 32 chars) | `your-secret-key-here` |
| `AUTH_PROVIDER` | Auth provider (`auth0` or `clerk`) | `clerk` |
| `AUTH_PROVIDER_KEY` | Auth provider publishable key | `pk_test_...` |
| `AUTH_PROVIDER_SECRET` | Auth provider secret key | `sk_test_...` |

### Storage & CDN

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_BUCKET` | Primary storage bucket | `animaforge-assets` |
| `S3_REGION` | AWS region or R2 endpoint | `us-east-1` |
| `S3_ACCESS_KEY` | S3 access key ID | `AKIA...` |
| `S3_SECRET_KEY` | S3 secret access key | `wJal...` |
| `CDN_BASE_URL` | CDN base URL for public assets | `https://cdn.animaforge.ai` |

### AI Services

| Variable | Description | Example |
|----------|-------------|---------|
| `AI_API_URL` | AI inference API base URL | `http://localhost:8000` |
| `AI_MODEL_PATH` | Path to model weights | `/models/animaforge-v2` |
| `GPU_DEVICE` | GPU device index | `cuda:0` |
| `CELERY_BROKER_URL` | Celery broker (Redis) | `redis://localhost:6379/1` |

### Event Bus

| Variable | Description | Example |
|----------|-------------|---------|
| `KAFKA_BROKERS` | Kafka broker addresses | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `animaforge-api` |

### Search

| Variable | Description | Example |
|----------|-------------|---------|
| `ELASTICSEARCH_URL` | Elasticsearch endpoint | `http://localhost:9200` |
| `ELASTICSEARCH_INDEX_PREFIX` | Index name prefix | `animaforge_` |

### Governance

| Variable | Description | Example |
|----------|-------------|---------|
| `C2PA_SIGNING_KEY` | Private key for C2PA manifest signing | `-----BEGIN EC PRIVATE KEY-----...` |
| `C2PA_CERT_CHAIN` | Certificate chain for C2PA | `-----BEGIN CERTIFICATE-----...` |
| `WATERMARK_SECRET` | Secret for watermark encoding | `wm-secret-key` |
| `MODERATION_API_URL` | Content moderation service URL | `http://localhost:8001` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_C2PA` | Enable C2PA content credentials | `true` |
| `ENABLE_WATERMARK` | Enable invisible watermarking | `true` |
| `ENABLE_MARKETPLACE` | Enable marketplace features | `true` |
| `ENABLE_ENTERPRISE` | Enable enterprise features | `false` |
| `MAX_CONCURRENT_JOBS` | Max parallel generation jobs | `10` |
| `MAX_UPLOAD_SIZE_MB` | Maximum file upload size | `500` |

---

## Production Deployment

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **App Nodes** | 2x 4 vCPU / 8GB RAM | 4x 8 vCPU / 16GB RAM |
| **GPU Nodes** | 1x NVIDIA A100 40GB | 4x NVIDIA H100 80GB |
| **PostgreSQL** | db.r6g.xlarge (4 vCPU / 32GB) | db.r6g.2xlarge + 2 read replicas |
| **Redis** | cache.r6g.large (2 vCPU / 13GB) | 3-node cluster, cache.r6g.xlarge |
| **Kafka** | 3-broker cluster, m5.large | 5-broker cluster, m5.xlarge |
| **Elasticsearch** | 2-node cluster, r5.large | 3-node cluster, r5.xlarge |

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml

# Verify rollout
kubectl -n animaforge rollout status deployment/web
kubectl -n animaforge rollout status deployment/api
kubectl -n animaforge rollout status deployment/ws
```

### ArgoCD GitOps

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: animaforge
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/animaforge/animaforge.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: animaforge
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

---

## Production Checklist

### Security
- [ ] All secrets stored in external secret manager (AWS Secrets Manager / Vault)
- [ ] TLS termination configured at load balancer
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled and tuned per tier
- [ ] API keys hashed with bcrypt before storage
- [ ] C2PA signing key stored in HSM or KMS
- [ ] Database connections use SSL with certificate verification
- [ ] Network policies restrict pod-to-pod communication

### Database
- [ ] PostgreSQL streaming replication configured with read replicas
- [ ] Automated daily backups with 30-day retention
- [ ] Point-in-time recovery (PITR) enabled
- [ ] pgvector indexes rebuilt after bulk data loads
- [ ] Connection pooling via PgBouncer (min 50 / max 200 connections)
- [ ] Vacuum and analyze scheduled during off-peak hours

### Monitoring
- [ ] Application metrics exported to Prometheus / Datadog
- [ ] Log aggregation via Loki / CloudWatch
- [ ] Distributed tracing with OpenTelemetry
- [ ] Alert rules for: error rate > 1%, p99 latency > 2s, queue depth > 100
- [ ] GPU utilization and temperature monitoring
- [ ] Uptime checks on all public endpoints

### Performance
- [ ] CDN configured for static assets and generated outputs
- [ ] Redis cluster with automatic failover
- [ ] Horizontal pod autoscaler for API and worker pods
- [ ] GPU autoscaling based on queue depth
- [ ] Database query performance monitoring (pg_stat_statements)
- [ ] Elasticsearch index lifecycle management configured

### CI/CD
- [ ] All tests passing (unit, integration, e2e)
- [ ] Docker images scanned for vulnerabilities
- [ ] Staging environment mirrors production topology
- [ ] Canary deployments for critical path changes
- [ ] Rollback procedure documented and tested
- [ ] Database migration tested against production-size dataset
