import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Supplies JWT_SECRET before any module reads it. authForward refuses to
    // run without one, by design — see src/middleware/authForward.ts.
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
