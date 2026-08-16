import { defineConfig, devices } from '@playwright/test';

/** Shared by services/auth and services/platform-api; see #82. */
const E2E_JWT_SECRET = process.env.E2E_JWT_SECRET ?? 'e2e-fixture-secret-not-a-real-key';

/*
 * Ports are overridable. The defaults are the ones the services use, but a
 * developer whose 4000 is already taken by something else should be able to
 * run the suite without editing this file — and the failure when they cannot
 * is an opaque "Process from config.webServer exited early".
 */
const WEB_PORT = process.env.E2E_WEB_PORT ?? '3000';
const AUTH_PORT = process.env.E2E_AUTH_PORT ?? '3003';
const PLATFORM_PORT = process.env.E2E_PLATFORM_PORT ?? '4000';

const AUTH_URL = `http://localhost:${AUTH_PORT}`;
const PLATFORM_URL = `http://localhost:${PLATFORM_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/animaforge_e2e';

/**
 * E2E configuration.
 *
 * Two servers are started, both real:
 *
 *   :3003  services/auth — the actual auth service. It falls back to an
 *          in-memory user store when Prisma is unavailable, so login is
 *          exercised for real (bcrypt comparison, JWT issue) without needing a
 *          database. globalSetup registers the fixture user through the
 *          service's own /auth/register endpoint.
 *   :3000  apps/web — served from a PRODUCTION build, not `next dev`.
 *
 * The web server used to be `npm run dev:web`. Dev mode compiles each route on
 * first request, so the first navigation to any page could take tens of
 * seconds while every later one took milliseconds. That is the single largest
 * source of flake in a Playwright suite, and no amount of waiting fixes it
 * reliably. `next build && next start` costs one build up front and then
 * behaves identically on every run.
 *
 *   :4000  services/platform-api — every console /api/* route proxies to it
 *          since #79. Backed by the same Postgres the migrations and seed
 *          target.
 *
 * DATABASE_URL and JWT_SECRET are shared by all three on purpose, and since
 * #82 that sharing is load-bearing rather than decorative: platform-api
 * verifies every signature against JWT_SECRET, so a mismatch is now a 401 on
 * every request instead of something nothing noticed.
 *
 * The database is not created here. Run migrations and the seed first:
 *
 *   createdb animaforge_e2e
 *   DATABASE_URL=... npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
 *   DATABASE_URL=... npm run db:seed --workspace @animaforge/db
 *
 * global-setup fails with that instruction if the database is not reachable,
 * rather than letting the specs fail one by one.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: ['**/fixtures/**'],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  /**
   * No retries, deliberately.
   *
   * This was `retries: 1`, which turns an intermittent failure into a green
   * run and hides it. A spec that needs a retry to pass is a spec that is
   * telling you something. If one of these starts flaking, it should be
   * visible immediately rather than averaged away.
   */
  retries: 0,

  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',

  /* Bounded so a hang fails in a minute rather than blocking the job. */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  globalSetup: './tests/e2e/fixtures/global-setup.ts',

  /**
   * Chromium only.
   *
   * A firefox project was declared here but CI only ever installed chromium
   * (`npx playwright install --with-deps chromium`), so the e2e job passed
   * `--project=chromium` to avoid launching a browser that was not on disk.
   * Declaring a project that cannot run is a trap for anyone running the suite
   * locally. Add firefox back together with the install step that provides it.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      name: 'auth',
      command: 'npx tsx src/index.ts',
      cwd: 'services/auth',
      url: `${AUTH_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: AUTH_PORT,
        /*
         * Not 'test'. services/auth/src/index.ts guards its listen call with
         * `if (process.env.NODE_ENV !== 'test')` so the Vitest suite can
         * import the app without binding a port — so NODE_ENV=test here makes
         * the process start, bind nothing and exit 0, which Playwright reports
         * only as "Process from config.webServer exited early".
         */
        NODE_ENV: 'development',
        JWT_SECRET: E2E_JWT_SECRET,
        /*
         * The same database platform-api reads.
         *
         * This was deliberately empty, so the auth service used its in-memory
         * user store. The note here said to point it back at the real database
         * "when #82 is fixed and the specs need one identity across both
         * services" — which is now. A token's `sub` has to name a row that
         * platform-api can see, or every project the specs create violates the
         * projects.owner_id foreign key and the list they assert on is empty.
         *
         * The hang that motivated the in-memory store was createSession()
         * reaching for Redis, not Prisma; Redis is in the harness now (see the
         * REDIS_URL below and the service container in ci.yml), so login
         * completes.
         */
        DATABASE_URL: E2E_DATABASE_URL,
        /*
         * createSession() reaches for Redis on every login. Without a
         * reachable server node-redis retries rather than failing fast, and
         * /auth/login hangs until the caller times out.
         */
        REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:6379',
      },
    },
    {
      name: 'platform-api',
      command: 'npx tsx src/index.ts',
      cwd: 'services/platform-api',
      url: `${PLATFORM_URL}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: PLATFORM_PORT,
        NODE_ENV: 'development',
        JWT_SECRET: E2E_JWT_SECRET,
        DATABASE_URL: E2E_DATABASE_URL,
      },
    },
    {
      name: 'web',
      command:
        'npm run build --workspace @animaforge/web && npm run start --workspace @animaforge/web',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      /* The build dominates this; 5 minutes is a cold CI build with margin. */
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: WEB_PORT,
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_AUTH_URL: AUTH_URL,
        PLATFORM_API_URL: PLATFORM_URL,
      },
    },
  ],
});
