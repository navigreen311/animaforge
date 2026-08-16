-- Columns the console pages read but the schema never had (issue #58, page wiring).
--
-- Two additions, each because a screen already displayed the value:
--
--   branching_scenes.created_at / updated_at
--     /live/branching lists narratives by recency. A narrative is the set of
--     scenes sharing narrative_id, and the table had no timestamp to order by.
--
--   generation_jobs.error_reason
--     The render queue shows why a failed job failed. There was no column to
--     read it from, so the page carried a hardcoded reason per mock row.
--
-- `prisma migrate diff` emits `updated_at TIMESTAMPTZ NOT NULL` with no default,
-- because @updatedAt is applied by the Prisma client rather than the database.
-- That form fails outright on a table that already has rows. So the column is
-- added WITH a default to backfill existing rows, then the default is dropped
-- to match what the schema models -- otherwise every future `migrate diff`
-- reports `ALTER COLUMN updated_at DROP DEFAULT` as drift forever.

ALTER TABLE "branching_scenes"
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "branching_scenes" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "generation_jobs"
    ADD COLUMN IF NOT EXISTS "error_reason" TEXT;
