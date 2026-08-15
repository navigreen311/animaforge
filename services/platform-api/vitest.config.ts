import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Seeds the parent rows the fixtures' foreign keys reference, and clears
    // their children between tests. A no-op without a reachable database, so
    // the in-memory path is unaffected. See src/__tests__/fixtures/seed.ts.
    setupFiles: ['./src/__tests__/fixtures/setup.ts'],
  },
});
