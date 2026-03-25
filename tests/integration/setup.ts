/**
 * Integration test setup — connects to a real PostgreSQL database,
 * runs migrations, and cleans tables between tests.
 */
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterEach, afterAll } from 'vitest';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/animaforge_test';

// Override for any service that reads process.env.DATABASE_URL
process.env.DATABASE_URL = DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: {
    db: { url: DATABASE_URL },
  },
});

beforeAll(async () => {
  await prisma.$connect();

  // Run pending migrations against the test database.
  // Using prisma migrate deploy (non-interactive, safe for CI).
  const { execSync } = await import('child_process');
  execSync('npx prisma migrate deploy', {
    cwd: new URL('../../packages/db', import.meta.url).pathname.replace(
      /^\//,
      '',
    ),
    env: { ...process.env, DATABASE_URL },
    stdio: 'pipe',
  });
});

afterEach(async () => {
  // Delete all rows in reverse dependency order to avoid FK violations.
  // Order derived from schema foreign key relationships.
  const tables = [
    'audit_trail',
    'moderation_logs',
    'generation_jobs',
    'shots',
    'scenes',
    'assets',
    'audio_tracks',
    'characters',
    'style_packs',
    'projects',
    'usage_meters',
    'subscriptions',
    'consents',
    'api_keys',
    'memberships',
    'teams',
    'users',
    'organizations',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
