# AnimaForge Database Schema

## Overview

AnimaForge uses **PostgreSQL 16** with the **pgvector** extension as its primary datastore. The schema is organized into logical entity groups with consistent patterns for soft deletion, auditing, and vector similarity search.

---

## Entity Groups

### 1. Identity & Access

| Table | Description |
|-------|-------------|
| `users` | User accounts with auth provider references |
| `organizations` | Enterprise organization entities |
| `org_memberships` | User-to-org mapping with roles |
| `api_keys` | Developer API keys with scopes |
| `sessions` | Active session tracking |

### 2. Projects & Content

| Table | Description |
|-------|-------------|
| `projects` | Animation projects with phase tracking |
| `shots` | Individual shots within a project timeline |
| `shot_versions` | Version history for each shot |
| `scenes` | Scene groupings within a project |
| `assets` | Uploaded media files (images, video, audio, 3D) |
| `project_assets` | Many-to-many linking assets to projects |

### 3. Characters & Identity

| Table | Description |
|-------|-------------|
| `characters` | Character definitions with style metadata |
| `character_references` | Reference images with angle metadata |
| `character_embeddings` | pgvector embeddings for identity consistency |
| `consent_records` | Likeness consent tracking |
| `digital_twins` | 3D avatar reconstructions linked to characters |

### 4. Generation & Processing

| Table | Description |
|-------|-------------|
| `generation_jobs` | Job queue entries with status and progress |
| `generation_outputs` | Completed output files with quality scores |
| `style_fingerprints` | Extracted style descriptors |
| `style_transfers` | Applied style transfer records |
| `post_processing_jobs` | Stabilization, upscaling, interpolation jobs |

### 5. Review & Collaboration

| Table | Description |
|-------|-------------|
| `reviews` | Shot review status and approver tracking |
| `comments` | Timestamped comments on shots |
| `comment_threads` | Threaded discussion groupings |
| `notifications` | User notification queue |

### 6. Governance & Provenance

| Table | Description |
|-------|-------------|
| `c2pa_manifests` | Content Credentials manifests |
| `watermark_records` | Embedded watermark metadata |
| `moderation_results` | Content moderation scan results |
| `audit_log` | Immutable audit trail (append-only) |

### 7. Marketplace & Billing

| Table | Description |
|-------|-------------|
| `marketplace_items` | Published marketplace listings |
| `marketplace_purchases` | Purchase transaction records |
| `credit_ledger` | Credit balance transactions |
| `subscriptions` | User subscription tier tracking |
| `invoices` | Billing invoice records |

---

## Key Tables (Detailed)

### `projects`

```sql
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id),
  org_id        UUID REFERENCES organizations(id),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  phase         VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (phase IN ('draft', 'generating', 'review', 'published', 'archived')),
  style_preset  VARCHAR(50),
  shot_count    INTEGER NOT NULL DEFAULT 0,
  total_duration_ms BIGINT NOT NULL DEFAULT 0,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_projects_owner ON projects(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_org ON projects(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_phase ON projects(phase) WHERE deleted_at IS NULL;
```

### `shots`

```sql
CREATE TABLE shots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id      UUID REFERENCES scenes(id),
  "order"       INTEGER NOT NULL,
  prompt        TEXT NOT NULL,
  negative_prompt TEXT,
  duration_ms   INTEGER NOT NULL DEFAULT 4000,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'approved', 'rejected')),
  style_preset  VARCHAR(50),
  output_url    TEXT,
  thumbnail_url TEXT,
  quality_score REAL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_shots_project ON shots(project_id, "order") WHERE deleted_at IS NULL;
CREATE INDEX idx_shots_status ON shots(status) WHERE deleted_at IS NULL;
```

### `characters`

```sql
CREATE TABLE characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(100) NOT NULL,
  type          VARCHAR(30) NOT NULL DEFAULT 'humanoid'
                  CHECK (type IN ('humanoid', 'creature', 'robot', 'abstract')),
  style         VARCHAR(30) NOT NULL DEFAULT 'realistic'
                  CHECK (style IN ('realistic', 'anime', 'cartoon', 'cel', 'pixel')),
  description   TEXT,
  reference_count INTEGER NOT NULL DEFAULT 0,
  consent_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (consent_status IN ('pending', 'approved', 'denied', 'expired')),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_characters_owner ON characters(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_characters_style ON characters(style) WHERE deleted_at IS NULL;
```

### `character_embeddings`

```sql
CREATE TABLE character_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  embedding     vector(512) NOT NULL,  -- pgvector
  model_version VARCHAR(30) NOT NULL,
  source_type   VARCHAR(20) NOT NULL CHECK (source_type IN ('reference_image', 'generated', 'manual')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_char_embed_character ON character_embeddings(character_id);
CREATE INDEX idx_char_embed_vector ON character_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### `generation_jobs`

```sql
CREATE TABLE generation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  model           VARCHAR(50) NOT NULL DEFAULT 'animaforge-v2',
  quality         VARCHAR(10) NOT NULL DEFAULT 'standard'
                    CHECK (quality IN ('draft', 'standard', 'high', 'ultra')),
  resolution      VARCHAR(20) NOT NULL DEFAULT '1920x1080',
  fps             INTEGER NOT NULL DEFAULT 24,
  progress        REAL NOT NULL DEFAULT 0.0,
  current_stage   VARCHAR(30),
  current_shot_id UUID REFERENCES shots(id),
  credits_used    INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_genjobs_project ON generation_jobs(project_id);
CREATE INDEX idx_genjobs_status ON generation_jobs(status);
CREATE INDEX idx_genjobs_user ON generation_jobs(user_id);
```

### `audit_log`

```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id),
  user_id     UUID REFERENCES users(id),
  user_email  VARCHAR(255),
  action      VARCHAR(30) NOT NULL,
  resource    VARCHAR(30) NOT NULL,
  resource_id VARCHAR(100),
  ip_address  INET,
  user_agent  TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only: no UPDATE or DELETE triggers
-- Partitioned by month for performance
CREATE INDEX idx_audit_org ON audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);
```

---

## Soft Delete Pattern

All mutable entity tables use a consistent soft-delete pattern:

```sql
-- Column
deleted_at TIMESTAMPTZ  -- NULL = active, non-NULL = soft-deleted

-- All queries filter by default
WHERE deleted_at IS NULL

-- Partial indexes exclude deleted rows
CREATE INDEX idx_example ON table(column) WHERE deleted_at IS NULL;

-- Soft delete operation
UPDATE projects SET deleted_at = now() WHERE id = $1;

-- Hard delete (background job, 30-day retention)
DELETE FROM projects WHERE deleted_at < now() - INTERVAL '30 days';
```

Benefits:
- Immediate "undo" capability for accidental deletions
- Audit trail preservation (audit_log references remain valid)
- Background cleanup keeps table sizes manageable
- Partial indexes ensure query performance is unaffected by soft-deleted rows

---

## pgvector Usage

AnimaForge uses the `pgvector` extension for character identity consistency and style similarity search.

### Character Identity Matching

```sql
-- Find characters visually similar to a query embedding
SELECT c.id, c.name, ce.embedding <=> $1::vector AS distance
FROM character_embeddings ce
JOIN characters c ON c.id = ce.character_id
WHERE c.deleted_at IS NULL
ORDER BY ce.embedding <=> $1::vector
LIMIT 10;
```

### Style Fingerprint Similarity

```sql
-- Find similar style fingerprints
SELECT sf.id, sf.texture_class, sf.palette,
       sf.mood_vector <=> $1::vector AS distance
FROM style_fingerprints sf
ORDER BY sf.mood_vector <=> $1::vector
LIMIT 5;
```

### Index Strategy

- **IVFFlat** indexes for approximate nearest-neighbor search on high-cardinality tables
- `lists` parameter tuned based on table size (generally `sqrt(n)` for n rows)
- Cosine distance operator (`<=>`) used for normalized embeddings
- Periodic `REINDEX` scheduled during low-traffic windows to maintain recall quality

### Embedding Dimensions

| Table | Column | Dimensions | Model |
|-------|--------|------------|-------|
| `character_embeddings` | `embedding` | 512 | CLIP ViT-L/14 |
| `style_fingerprints` | `mood_vector` | 128 | Custom style encoder |
| `style_fingerprints` | `texture_vector` | 256 | Custom texture encoder |

---

## Migrations

Migrations are managed via **Prisma Migrate** (Node.js platform API) and **Alembic** (Python AI services), coordinated through a shared migration registry table:

```sql
CREATE TABLE migration_registry (
  service     VARCHAR(30) NOT NULL,
  version     VARCHAR(50) NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service, version)
);
```

This prevents conflicting migrations from different services modifying the same tables simultaneously.
