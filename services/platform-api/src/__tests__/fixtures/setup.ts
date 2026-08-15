/**
 * Vitest setup: give the fixtures' foreign keys something to point at.
 *
 * Registered as a `setupFiles` entry so all twelve suites get it without each
 * one growing its own hook. Against the in-memory store every call here is a
 * no-op, so the suite behaves exactly as before when Postgres is absent — which
 * is what a developer running `npm test` with no DATABASE_URL gets.
 *
 * The per-test cleanup mirrors what the suites already do: eleven of twelve
 * call some `_clear()` in `beforeEach` to isolate the in-memory store. Postgres
 * needs the same isolation or rows leak between tests and list endpoints start
 * returning a previous test's data.
 */
import { beforeAll, beforeEach } from 'vitest';

import { clearFixtureChildren, seedFixtureRows } from './seed.js';

beforeAll(async () => {
  await seedFixtureRows();
});

beforeEach(async () => {
  await clearFixtureChildren();
});
