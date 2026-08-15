-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "mode" TEXT,
ADD COLUMN     "project_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "live_recordings" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "frames_rendered" INTEGER,
    "saved_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "preview_url" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolio" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rates" JSONB NOT NULL DEFAULT '{}',
    "availability" TEXT NOT NULL DEFAULT 'available',
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "talent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_bookings" (
    "id" TEXT NOT NULL,
    "talent_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "dates" JSONB NOT NULL DEFAULT '{}',
    "rate" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "talent_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "receipt_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "project_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateIndex
CREATE INDEX "live_recordings_session_id_idx" ON "live_recordings"("session_id");

-- CreateIndex
CREATE INDEX "live_chat_messages_session_id_timestamp_idx" ON "live_chat_messages"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "marketplace_items_creator_id_idx" ON "marketplace_items"("creator_id");

-- CreateIndex
CREATE INDEX "marketplace_items_status_featured_idx" ON "marketplace_items"("status", "featured");

-- CreateIndex
CREATE INDEX "talent_profiles_availability_idx" ON "talent_profiles"("availability");

-- CreateIndex
CREATE INDEX "talent_bookings_talent_id_idx" ON "talent_bookings"("talent_id");

-- CreateIndex
CREATE INDEX "talent_bookings_project_id_idx" ON "talent_bookings"("project_id");

-- CreateIndex
CREATE INDEX "receipts_user_id_created_at_idx" ON "receipts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "live_sessions_project_id_idx" ON "live_sessions"("project_id");

