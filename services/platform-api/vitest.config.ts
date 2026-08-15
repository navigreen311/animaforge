import { defineConfig } from 'vitest/config';

/**
 * Test files run in parallel by default, which is fine while every suite owns
 * a private in-memory Map — each worker gets its own module instance, so there
 * is nothing to contend over.
 *
 * A real database is shared. With parallelism on, one file's `beforeEach`
 * cleanup deletes rows another file created microseconds earlier, and the
 * symptom is a read returning 404 for a row whose write returned 201. So when
 * DATABASE_URL is set the files are serialised.
 *
 * Conditioned on DATABASE_URL rather than applied unconditionally so local runs
 * without a database keep their parallelism; the suite is ~1s either way, and
 * correctness against shared state is not negotiable.
 */
const usesSharedDatabase = Boolean(process.env.DATABASE_URL);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Seeds the parent rows the fixtures' foreign keys reference, and clears
    // their children between tests. A no-op without a reachable database.
    // See src/__tests__/fixtures/seed.ts.
    setupFiles: ['./src/__tests__/fixtures/setup.ts'],
    fileParallelism: !usesSharedDatabase,
  },
});
