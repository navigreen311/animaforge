-- Creates the 15 tables that schema.prisma declares but no migration ever
-- created. The schema and the migration history had drifted: models were added
-- to schema.prisma without generating a migration, so `prisma migrate deploy`
-- produced a database missing a third of its tables — including notifications,
-- shot_reviews, live_sessions and webhook_deliveries, all of which services
-- query at runtime.
--
-- Generated from the current datamodel, so live_sessions is created with the
-- projectId/mode columns and nullable userId it needs; the ALTER that would
-- have added them to a pre-existing table is dropped from the next migration.

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_reviews" (
    "id" TEXT NOT NULL,
    "shot_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_jobs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "export_url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "published_at" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "platform_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presences" (
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "current_page" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "last_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_presences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "current_url" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelog_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "changelog_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_records" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "credited_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_pct" INTEGER NOT NULL DEFAULT 0,
    "allowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "services" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "request_body" TEXT NOT NULL,
    "request_headers" JSONB NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    "duration_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "project_id" TEXT,
    "mode" TEXT,
    "avatar_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "destinations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "viewer_peak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branching_scenes" (
    "id" TEXT NOT NULL,
    "narrative_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "emotion" TEXT,
    "pose" TEXT,
    "position" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "branching_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "owner_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "from_task_id" TEXT NOT NULL,
    "to_task_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'blocks',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "shot_reviews_shot_id_idx" ON "shot_reviews"("shot_id");

-- CreateIndex
CREATE INDEX "shot_reviews_project_id_idx" ON "shot_reviews"("project_id");

-- CreateIndex
CREATE INDEX "feedbacks_type_status_idx" ON "feedbacks"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "changelog_views_user_id_version_key" ON "changelog_views"("user_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "referral_records_referee_id_key" ON "referral_records"("referee_id");

-- CreateIndex
CREATE INDEX "referral_records_referrer_id_idx" ON "referral_records"("referrer_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhook_id_created_at_idx" ON "webhook_deliveries"("webhook_id", "created_at");

-- CreateIndex
CREATE INDEX "live_sessions_user_id_idx" ON "live_sessions"("user_id");

-- CreateIndex
CREATE INDEX "live_sessions_project_id_idx" ON "live_sessions"("project_id");

-- CreateIndex
CREATE INDEX "branching_scenes_narrative_id_idx" ON "branching_scenes"("narrative_id");

-- CreateIndex
CREATE INDEX "calendar_events_user_id_start_date_idx" ON "calendar_events"("user_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_from_task_id_to_task_id_key" ON "task_dependencies"("from_task_id", "to_task_id");
