import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Supplies JWT_SECRET before any module reads it. The collab service
    // refuses to verify without one, by design — see src/auth.ts.
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
