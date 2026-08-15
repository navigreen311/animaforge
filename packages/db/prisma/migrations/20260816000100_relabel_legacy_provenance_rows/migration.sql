-- Carried over from 20260814120000_real_provenance_watermark_fingerprint,
-- the only statement in the squashed history that was not DDL and so could
-- not be regenerated from schema.prisma. A no-op on an empty database;
-- kept so the intent survives the squash. Idempotent -- a relabelled row no
-- longer matches the WHERE clause.

-- ============================================================
-- 5. Retire the overloaded audit_trail provenance rows
-- ============================================================
-- These rows were the old home-grown store. They are kept (audit_trail is an
-- audit log) but re-labelled so nothing reads them as live provenance.
UPDATE "audit_trail"
   SET "action" = 'legacy:' || "action"
 WHERE "action" IN ('c2pa:manifest', 'watermark:embed');
