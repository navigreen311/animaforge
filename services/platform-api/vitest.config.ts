import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The CI test-api job points every suite at ONE Postgres database, and the
    // fixture layer clears tables between tests. Run files sequentially so one
    // suite's reset cannot delete rows another suite is mid-way through using.
    // The whole suite runs in well under a second, so this costs nothing and
    // removes an entire class of cross-file flake.
    fileParallelism: false,
  },
});
