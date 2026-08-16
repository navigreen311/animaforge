import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // JWT_SECRET is required with no fallback (#82), so the suites have to
    // supply one before any module reads it. The alternative -- a development
    // default inside the service -- is the thing this change removed.
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
