import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['./**/*.test.ts'],
    testTimeout: 30000,
    setupFiles: ['./setup.ts'],
    // Sequential execution — shared DB state between tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      concurrent: false,
    },
  },
});
