/**
 * UUID guards for the uuid-keyed tables.
 *
 * The core tables (`projects`, `scenes`, `shots`, `characters`, `assets`) use
 * `@db.Uuid` primary keys. Passing a non-UUID string into a `where: { id }`
 * makes Prisma throw `Inconsistent column data: Error creating UUID` — a 500 —
 * where the honest answer is 404: a malformed id cannot match any row. Guard
 * lookups with `isUuid` so a bad path parameter is "not found", not "server
 * error".
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
