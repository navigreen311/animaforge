-- Real provenance: C2PA manifests, pixel-domain watermarks, perceptual fingerprints.
--
-- Replaces the previous practice of overloading `audit_trail` with
-- `c2pa:manifest` / `watermark:embed` rows, which had no schema, no indexes and
-- no way to express "this record is unsigned".
--
-- NOTE: `piracy_matches` and `dmca_notices` exist in schema.prisma but were
-- never emitted by a migration, so they are created here IF NOT EXISTS to bring
-- the migration history back in line with the schema before altering them.

-- ============================================================
-- 1. C2PA manifests
-- ============================================================
CREATE TABLE IF NOT EXISTS "c2pa_manifests" (
    "id"                   TEXT PRIMARY KEY,
    "output_id"            TEXT NOT NULL,
    "job_id"               TEXT NOT NULL,
    "project_id"           TEXT,
    "user_id_hash"         TEXT,
    "asset_url"            TEXT,
    "asset_path"           TEXT,
    "asset_sha256"         TEXT,
    "signed_asset_sha256"  TEXT,
    "format"               TEXT NOT NULL,
    "manifest_label"       TEXT,
    "claim_generator"      TEXT NOT NULL,
    "signature_alg"        TEXT,
    "cert_serial_number"   TEXT,
    "cert_issuer"          TEXT,
    "timestamped_at"       TIMESTAMPTZ,
    "signed"               BOOLEAN NOT NULL DEFAULT FALSE,
    "embedded"             BOOLEAN NOT NULL DEFAULT FALSE,
    "mode"                 TEXT NOT NULL DEFAULT 'degraded',
    "degraded_reason"      TEXT,
    "manifest_json"        JSONB NOT NULL DEFAULT '{}',
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "c2pa_manifests_output_id_key"
    ON "c2pa_manifests"("output_id");
CREATE INDEX IF NOT EXISTS "c2pa_manifests_job_id_idx"
    ON "c2pa_manifests"("job_id");
CREATE INDEX IF NOT EXISTS "c2pa_manifests_signed_asset_sha256_idx"
    ON "c2pa_manifests"("signed_asset_sha256");

-- ============================================================
-- 2. Watermarks
-- ============================================================
CREATE TABLE IF NOT EXISTS "watermarks" (
    "id"             TEXT PRIMARY KEY,
    "watermark_id"   TEXT NOT NULL,
    "job_id"         TEXT NOT NULL,
    "output_id"      TEXT,
    "user_id"        TEXT,
    "payload_hex"    TEXT NOT NULL,
    "algorithm"      TEXT NOT NULL DEFAULT 'dct-pair-v1',
    "strength"       DOUBLE PRECISION NOT NULL DEFAULT 20,
    "seed"           TEXT NOT NULL,
    "media_type"     TEXT NOT NULL,
    "mode"           TEXT NOT NULL DEFAULT 'embedded',
    "source_sha256"  TEXT,
    "marked_sha256"  TEXT,
    "output_url"     TEXT,
    "metadata"       JSONB NOT NULL DEFAULT '{}',
    "embedded_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "watermarks_watermark_id_key"
    ON "watermarks"("watermark_id");
CREATE INDEX IF NOT EXISTS "watermarks_job_id_idx" ON "watermarks"("job_id");
CREATE INDEX IF NOT EXISTS "watermarks_payload_hex_idx" ON "watermarks"("payload_hex");

-- ============================================================
-- 3. Fingerprints
-- ============================================================
CREATE TABLE IF NOT EXISTS "fingerprints" (
    "id"             TEXT PRIMARY KEY,
    "output_id"      TEXT NOT NULL,
    "user_id"        TEXT,
    "media_type"     TEXT NOT NULL,
    "algorithm"      TEXT NOT NULL DEFAULT 'phash-dct64',
    "phash"          TEXT NOT NULL,
    "ahash"          TEXT,
    "dhash"          TEXT,
    "frame_hashes"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "duration_ms"    INTEGER,
    "width"          INTEGER,
    "height"         INTEGER,
    "source_sha256"  TEXT,
    "metadata"       JSONB NOT NULL DEFAULT '{}',
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "fingerprints_output_id_idx" ON "fingerprints"("output_id");
CREATE INDEX IF NOT EXISTS "fingerprints_phash_idx" ON "fingerprints"("phash");

-- ============================================================
-- 4. Piracy matches / DMCA notices — reconcile then extend
-- ============================================================
CREATE TABLE IF NOT EXISTS "piracy_matches" (
    "id"              TEXT PRIMARY KEY,
    "output_id"       TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "platform"        TEXT NOT NULL,
    "match_url"       TEXT NOT NULL,
    "match_strength"  DOUBLE PRECISION NOT NULL,
    "watermark_found" BOOLEAN NOT NULL DEFAULT FALSE,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "detected_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "reviewed_at"     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "dmca_notices" (
    "id"           TEXT PRIMARY KEY,
    "match_id"     TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'draft',
    "filed_at"     TIMESTAMPTZ,
    "case_number"  TEXT,
    "response_at"  TIMESTAMPTZ,
    "metadata"     JSONB NOT NULL DEFAULT '{}',
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "piracy_matches"
    ADD COLUMN IF NOT EXISTS "fingerprint_id"   TEXT,
    ADD COLUMN IF NOT EXISTS "match_method"     TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS "hamming_distance" INTEGER,
    ADD COLUMN IF NOT EXISTS "watermark_id"     TEXT,
    ADD COLUMN IF NOT EXISTS "evidence"         JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "dmca_notices"
    ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS "body"     TEXT;

CREATE INDEX IF NOT EXISTS "piracy_matches_user_id_status_idx"
    ON "piracy_matches"("user_id", "status");
CREATE INDEX IF NOT EXISTS "piracy_matches_fingerprint_id_idx"
    ON "piracy_matches"("fingerprint_id");
CREATE INDEX IF NOT EXISTS "dmca_notices_match_id_idx" ON "dmca_notices"("match_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'piracy_matches_fingerprint_id_fkey'
    ) THEN
        ALTER TABLE "piracy_matches"
            ADD CONSTRAINT "piracy_matches_fingerprint_id_fkey"
            FOREIGN KEY ("fingerprint_id") REFERENCES "fingerprints"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 5. Retire the overloaded audit_trail provenance rows
-- ============================================================
-- These rows were the old home-grown store. They are kept (audit_trail is an
-- audit log) but re-labelled so nothing reads them as live provenance.
UPDATE "audit_trail"
   SET "action" = 'legacy:' || "action"
 WHERE "action" IN ('c2pa:manifest', 'watermark:embed');
