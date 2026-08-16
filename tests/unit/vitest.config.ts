import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: path.resolve(__dirname, '../..'),
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
    environment: 'node',
    // Supplies JWT_SECRET before any module reads it. collab's verifyToken
    // refuses to verify without one, by design.
    setupFiles: [path.resolve(__dirname, 'setup.ts')],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['services/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: ['**/__tests__/**', '**/node_modules/**', '**/dist/**'],
    },
  },
  resolve: {
    alias: {
      '@animaforge/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@animaforge/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
});
