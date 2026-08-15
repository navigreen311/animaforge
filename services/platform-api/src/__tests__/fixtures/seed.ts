/**
 * Seed the rows the test fixtures' foreign keys point at.
 *
 * The suite was written against an in-memory `Map`, which enforces no
 * referential integrity, so nothing ever inserted the parents its ids
 * referenced. Against real Postgres that surfaced as 42 foreign key violations
 * (#73): 25 on `characters_owner_id_fkey`, 15 on `scenes_project_id_fkey`,
 * 2 on `projects_owner_id_fkey`.
 *
 * The ids here are not invented. They are the ones the code and tests already
 * use — `STUB_OWNER_ID` from the controllers, and the deterministic UUIDs the
 * fixtures were converted to in #69. This only gives them rows.
 *
 * Idempotent, and a no-op when the database is unreachable, so the same suite
 * runs unchanged against the in-memory store.
 */
import { isDatabaseReachable, prisma } from '../../db.js';

/** The owner every controller attributes writes to. */
export const STUB_OWNER_ID = '00000000-0000-0000-0000-000000000001';

/** Users the fixtures reference as owners, actors or subjects. */
export const SEED_USER_IDS = [
  STUB_OWNER_ID,
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000020',
] as const;

/** Projects the fixtures attach characters, scenes and shots to. */
export const SEED_PROJECT_IDS = [
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '11111111-1111-4111-8111-000000000001',
  '11111111-1111-4111-8111-000000000002',
] as const;

let seeded = false;

/**
 * Insert the parent rows, once per process.
 *
 * Raw SQL rather than the Prisma client on purpose: this has to work whatever
 * shape the generated client is in, and `ON CONFLICT DO NOTHING` makes a
 * re-run free. Columns are limited to the NOT NULL ones without defaults, so
 * the seed does not drift every time the schema gains a field.
 */
export async function seedFixtureRows(): Promise<boolean> {
  if (seeded) return true;
  if (!(await isDatabaseReachable()) || !prisma) return false;

  try {
    return await insertFixtureRows();
  } catch (err) {
    // A seed that throws aborts every suite before a single test runs, and the
    // reporter then emits a report with zero tests in it — which reads exactly
    // like a clean pass. Say what happened instead.
    const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new Error(
      `Fixture seeding failed, so no test in this suite ran: ${message}. ` +
        'Check that migrations are applied and that every NOT NULL column ' +
        'without a database default is supplied above.',
    );
  }
}

async function insertFixtureRows(): Promise<boolean> {
  if (!prisma) return false;

  for (const id of SEED_USER_IDS) {
    // email is UNIQUE, so it is derived from the id rather than shared.
    //
    // updated_at is @updatedAt in the schema, which Prisma maintains in the
    // client rather than the database — so the column is NOT NULL with no
    // DEFAULT, and raw SQL has to supply it. Omitting it threw on every row
    // and took the whole suite down with the seed.
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, display_name, role, tier, updated_at)
       VALUES ($1::uuid, $2, $3, 'creator', 'free', NOW())
       ON CONFLICT (id) DO NOTHING`,
      id,
      `fixture+${id}@animaforge.test`,
      `Fixture User ${id.slice(-4)}`,
    );
  }

  for (const id of SEED_PROJECT_IDS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO projects (id, owner_id, title, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, NOW())
       ON CONFLICT (id) DO NOTHING`,
      id,
      STUB_OWNER_ID,
      `Fixture Project ${id.slice(-4)}`,
    );
  }

  seeded = true;
  return true;
}

/**
 * Remove rows created by a test, leaving the seeded parents in place.
 *
 * Child-first so foreign keys stay satisfied through the delete. Scoped to the
 * fixture owner and projects, so a developer pointing DATABASE_URL at a
 * database with real data in it does not lose it.
 */
export async function clearFixtureChildren(): Promise<void> {
  if (!(await isDatabaseReachable()) || !prisma) return;

  // Every comparison casts the *column* to text rather than the literal to
  // uuid, because the id columns are not consistently typed: characters,
  // scenes, shots and projects use @db.Uuid, while receipts.user_id is plain
  // TEXT. Casting the literal produced `operator does not exist: text = uuid`
  // on receipts and took all twelve suites down. uuid::text is the canonical
  // lowercase form, which is how these ids are written below.
  const projects = SEED_PROJECT_IDS.map((id) => `'${id}'`).join(',');
  const users = SEED_USER_IDS.map((id) => `'${id}'`).join(',');
  const owner = `'${STUB_OWNER_ID}'`;

  await prisma.$executeRawUnsafe(
    `DELETE FROM shots WHERE scene_id::text IN (
       SELECT id::text FROM scenes WHERE project_id::text IN (${projects}))`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM scenes WHERE project_id::text IN (${projects})`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM characters
      WHERE owner_id::text = ${owner} OR project_id::text IN (${projects})`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM receipts WHERE user_id::text IN (${users})`,
  );
  // Projects created by a test, as distinct from the seeded ones.
  await prisma.$executeRawUnsafe(
    `DELETE FROM projects
      WHERE owner_id::text = ${owner} AND id::text NOT IN (${projects})`,
  );
}

/** Reset the once-per-process guard. For tests of the seed itself. */
export function resetSeedState(): void {
  seeded = false;
}
