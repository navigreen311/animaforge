-- AnimaForge Initial Migration
-- Generated: 2026-03-25

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Users
-- ============================================================
CREATE TABLE "users" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email"           VARCHAR(255) NOT NULL UNIQUE,
    "password_hash"   VARCHAR(255),
    "display_name"    VARCHAR(128) NOT NULL,
    "avatar_url"      TEXT,
    "role"            VARCHAR(32) NOT NULL DEFAULT 'member',
    "email_verified"  BOOLEAN NOT NULL DEFAULT FALSE,
    "oauth_provider"  VARCHAR(32),
    "oauth_id"        VARCHAR(255),
    "preferences"     JSONB NOT NULL DEFAULT '{}',
    "last_login_at"   TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "idx_users_email" ON "users"("email");

-- ============================================================
-- 2. Organizations
-- ============================================================
CREATE TABLE "organizations" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name"            VARCHAR(128) NOT NULL,
    "slug"            VARCHAR(128) NOT NULL UNIQUE,
    "logo_url"        TEXT,
    "plan"            VARCHAR(32) NOT NULL DEFAULT 'free',
    "sso_domain"      VARCHAR(255),
    "settings"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Teams
-- ============================================================
CREATE TABLE "teams" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id"          UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name"            VARCHAR(128) NOT NULL,
    "description"     TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. Memberships
-- ============================================================
CREATE TABLE "memberships" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id"         UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "org_id"          UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "team_id"         UUID REFERENCES "teams"("id") ON DELETE SET NULL,
    "role"            VARCHAR(32) NOT NULL DEFAULT 'member',
    "invited_by"      UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "accepted_at"     TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("user_id", "org_id")
);

-- ============================================================
-- 5. API Keys
-- ============================================================
CREATE TABLE "api_keys" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id"         UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "org_id"          UUID REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name"            VARCHAR(128) NOT NULL,
    "key_hash"        VARCHAR(255) NOT NULL UNIQUE,
    "prefix"          VARCHAR(16) NOT NULL,
    "scopes"          TEXT[] NOT NULL DEFAULT '{}',
    "last_used_at"    TIMESTAMPTZ,
    "expires_at"      TIMESTAMPTZ,
    "revoked_at"      TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. Projects
-- ============================================================
CREATE TABLE "projects" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "owner_id"        UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "org_id"          UUID REFERENCES "organizations"("id") ON DELETE SET NULL,
    "title"           VARCHAR(255) NOT NULL,
    "description"     TEXT,
    "thumbnail_url"   TEXT,
    "status"          VARCHAR(32) NOT NULL DEFAULT 'draft',
    "fps"             INTEGER NOT NULL DEFAULT 24,
    "width"           INTEGER NOT NULL DEFAULT 1920,
    "height"          INTEGER NOT NULL DEFAULT 1080,
    "duration_ms"     BIGINT NOT NULL DEFAULT 0,
    "settings"        JSONB NOT NULL DEFAULT '{}',
    "published_at"    TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_projects_owner_id" ON "projects"("owner_id");

-- ============================================================
-- 7. Scenes
-- ============================================================
CREATE TABLE "scenes" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id"      UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "title"           VARCHAR(255) NOT NULL,
    "order_index"     INTEGER NOT NULL DEFAULT 0,
    "description"     TEXT,
    "settings"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. Shots
-- ============================================================
CREATE TABLE "shots" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id"      UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "scene_id"        UUID REFERENCES "scenes"("id") ON DELETE SET NULL,
    "title"           VARCHAR(255),
    "order_index"     INTEGER NOT NULL DEFAULT 0,
    "prompt"          TEXT,
    "negative_prompt" TEXT,
    "start_ms"        BIGINT NOT NULL DEFAULT 0,
    "end_ms"          BIGINT NOT NULL DEFAULT 0,
    "status"          VARCHAR(32) NOT NULL DEFAULT 'pending',
    "output_url"      TEXT,
    "thumbnail_url"   TEXT,
    "settings"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_shots_project_id" ON "shots"("project_id");
CREATE INDEX "idx_shots_scene_id" ON "shots"("scene_id");

-- ============================================================
-- 9. Characters
-- ============================================================
CREATE TABLE "characters" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "owner_id"        UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "project_id"      UUID REFERENCES "projects"("id") ON DELETE SET NULL,
    "name"            VARCHAR(128) NOT NULL,
    "description"     TEXT,
    "avatar_url"      TEXT,
    "model_url"       TEXT,
    "embedding"       JSONB,
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_characters_owner_id" ON "characters"("owner_id");

-- ============================================================
-- 10. Assets
-- ============================================================
CREATE TABLE "assets" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id"      UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "uploaded_by"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type"            VARCHAR(32) NOT NULL,
    "filename"        VARCHAR(512) NOT NULL,
    "mime_type"       VARCHAR(128) NOT NULL,
    "size_bytes"      BIGINT NOT NULL DEFAULT 0,
    "storage_key"     VARCHAR(1024) NOT NULL,
    "url"             TEXT,
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. Style Packs
-- ============================================================
CREATE TABLE "style_packs" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "creator_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name"            VARCHAR(128) NOT NULL,
    "description"     TEXT,
    "thumbnail_url"   TEXT,
    "fingerprint"     JSONB,
    "settings"        JSONB NOT NULL DEFAULT '{}',
    "is_public"       BOOLEAN NOT NULL DEFAULT FALSE,
    "downloads"       INTEGER NOT NULL DEFAULT 0,
    "price_cents"     INTEGER NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. Generation Jobs
-- ============================================================
CREATE TABLE "generation_jobs" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id"      UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "shot_id"         UUID REFERENCES "shots"("id") ON DELETE SET NULL,
    "user_id"         UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type"            VARCHAR(64) NOT NULL,
    "status"          VARCHAR(32) NOT NULL DEFAULT 'queued',
    "priority"        INTEGER NOT NULL DEFAULT 0,
    "input_params"    JSONB NOT NULL DEFAULT '{}',
    "output_url"      TEXT,
    "error_message"   TEXT,
    "progress"        REAL NOT NULL DEFAULT 0,
    "credits_used"    INTEGER NOT NULL DEFAULT 0,
    "model_id"        VARCHAR(128),
    "worker_id"       VARCHAR(128),
    "started_at"      TIMESTAMPTZ,
    "completed_at"    TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_generation_jobs_project_id" ON "generation_jobs"("project_id");
CREATE INDEX "idx_generation_jobs_status" ON "generation_jobs"("status");

-- ============================================================
-- 13. Audio Tracks
-- ============================================================
CREATE TABLE "audio_tracks" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id"      UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "shot_id"         UUID REFERENCES "shots"("id") ON DELETE SET NULL,
    "type"            VARCHAR(32) NOT NULL,
    "label"           VARCHAR(255),
    "storage_key"     VARCHAR(1024) NOT NULL,
    "url"             TEXT,
    "duration_ms"     BIGINT NOT NULL DEFAULT 0,
    "start_ms"        BIGINT NOT NULL DEFAULT 0,
    "volume"          REAL NOT NULL DEFAULT 1.0,
    "settings"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. Consents
-- ============================================================
CREATE TABLE "consents" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "subject_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "granted_by"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type"            VARCHAR(64) NOT NULL,
    "scope"           VARCHAR(128) NOT NULL,
    "document_url"    TEXT,
    "valid_from"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "valid_until"     TIMESTAMPTZ,
    "revoked_at"      TIMESTAMPTZ,
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_consents_subject_id" ON "consents"("subject_id");

-- ============================================================
-- 15. Moderation Logs
-- ============================================================
CREATE TABLE "moderation_logs" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "job_id"          UUID REFERENCES "generation_jobs"("id") ON DELETE SET NULL,
    "reviewer_id"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "action"          VARCHAR(32) NOT NULL,
    "category"        VARCHAR(64),
    "confidence"      REAL,
    "reason"          TEXT,
    "input_hash"      VARCHAR(128),
    "output_hash"     VARCHAR(128),
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 16. Audit Trail
-- ============================================================
CREATE TABLE "audit_trail" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "actor_id"        UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "org_id"          UUID REFERENCES "organizations"("id") ON DELETE SET NULL,
    "action"          VARCHAR(128) NOT NULL,
    "resource_type"   VARCHAR(64) NOT NULL,
    "resource_id"     UUID,
    "ip_address"      VARCHAR(45),
    "user_agent"      TEXT,
    "old_value"       JSONB,
    "new_value"       JSONB,
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 17. Subscriptions
-- ============================================================
CREATE TABLE "subscriptions" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id"          UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "plan"            VARCHAR(32) NOT NULL,
    "status"          VARCHAR(32) NOT NULL DEFAULT 'active',
    "stripe_sub_id"   VARCHAR(255),
    "stripe_cust_id"  VARCHAR(255),
    "current_period_start" TIMESTAMPTZ NOT NULL,
    "current_period_end"   TIMESTAMPTZ NOT NULL,
    "cancel_at"       TIMESTAMPTZ,
    "canceled_at"     TIMESTAMPTZ,
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 18. Usage Meters
-- ============================================================
CREATE TABLE "usage_meters" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id"          UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id"         UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "metric"          VARCHAR(64) NOT NULL,
    "quantity"        BIGINT NOT NULL DEFAULT 0,
    "unit"            VARCHAR(32) NOT NULL DEFAULT 'credits',
    "period_start"    TIMESTAMPTZ NOT NULL,
    "period_end"      TIMESTAMPTZ NOT NULL,
    "metadata"        JSONB NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
