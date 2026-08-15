-- Console persistence models (issue #58).
--
-- Fourteen tables the apps/web routes already claimed to manage. Generated
-- with:
--   prisma migrate diff --from-migrations ./prisma/migrations \
--     --to-schema-datamodel ./prisma/schema.prisma --script
-- against a throwaway shadow database, so it is exactly the delta from the
-- squashed baseline (#71) and keeps the history linear.

-- CreateExtension

-- CreateTable
CREATE TABLE "asset_folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatars" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source_type" TEXT NOT NULL DEFAULT 'upload',
    "preview_url" TEXT,
    "model_url" TEXT,
    "voice_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'builtin',
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "gender" TEXT,
    "preview_url" TEXT,
    "is_cloned" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_kits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "name" TEXT NOT NULL,
    "colors" JSONB NOT NULL DEFAULT '[]',
    "fonts" JSONB NOT NULL DEFAULT '[]',
    "logo_url" TEXT,
    "sonic_url" TEXT,
    "project_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verify_token" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ,
    "project_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "shot_id" TEXT,
    "label" TEXT NOT NULL,
    "time_ms" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'screenplay',
    "content" TEXT NOT NULL DEFAULT '',
    "structure" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shot_takes" (
    "id" TEXT NOT NULL,
    "shot_id" TEXT NOT NULL,
    "job_id" TEXT,
    "take_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "output_url" TEXT,
    "thumb_url" TEXT,
    "duration_ms" INTEGER,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_takes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "team_id" TEXT,
    "org_id" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "resent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "location" TEXT,
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_status" INTEGER,
    "last_triggered" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_purchases" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "fee_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'complete',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_folders_user_id_idx" ON "asset_folders"("user_id");

-- CreateIndex
CREATE INDEX "asset_folders_parent_id_idx" ON "asset_folders"("parent_id");

-- CreateIndex
CREATE INDEX "avatars_user_id_idx" ON "avatars"("user_id");

-- CreateIndex
CREATE INDEX "voices_user_id_idx" ON "voices"("user_id");

-- CreateIndex
CREATE INDEX "brand_kits_user_id_idx" ON "brand_kits"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");

-- CreateIndex
CREATE INDEX "custom_domains_user_id_idx" ON "custom_domains"("user_id");

-- CreateIndex
CREATE INDEX "markers_project_id_time_ms_idx" ON "markers"("project_id", "time_ms");

-- CreateIndex
CREATE INDEX "scripts_user_id_idx" ON "scripts"("user_id");

-- CreateIndex
CREATE INDEX "scripts_project_id_idx" ON "scripts"("project_id");

-- CreateIndex
CREATE INDEX "shot_takes_shot_id_take_number_idx" ON "shot_takes"("shot_id", "take_number");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_email_status_idx" ON "team_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "team_invitations_team_id_idx" ON "team_invitations"("team_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "webhook_endpoints_user_id_idx" ON "webhook_endpoints"("user_id");

-- CreateIndex
CREATE INDEX "marketplace_purchases_buyer_id_idx" ON "marketplace_purchases"("buyer_id");

-- CreateIndex
CREATE INDEX "marketplace_purchases_seller_id_idx" ON "marketplace_purchases"("seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_purchases_item_id_buyer_id_key" ON "marketplace_purchases"("item_id", "buyer_id");

-- CreateIndex
CREATE INDEX "marketplace_reviews_item_id_idx" ON "marketplace_reviews"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reviews_item_id_author_id_key" ON "marketplace_reviews"("item_id", "author_id");

-- CreateIndex
CREATE INDEX "wishlist_items_user_id_idx" ON "wishlist_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_item_id_user_id_key" ON "wishlist_items"("item_id", "user_id");

-- AddForeignKey
ALTER TABLE "asset_folders" ADD CONSTRAINT "asset_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "asset_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_purchases" ADD CONSTRAINT "marketplace_purchases_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "marketplace_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "marketplace_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "marketplace_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

