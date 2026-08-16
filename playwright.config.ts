import { defineConfig, devices } from '@playwright/test';

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
 * There is deliberately no database seeding step. The web app under test does
 * not read one: /projects, /shots and the rest are served by Next route
 * handlers backed by apps/web/src/lib/mockData.ts. Standing up Postgres and
 * seeding it would not change a single pixel these tests observe, so the
 * fixture data is the mock module and the seeded auth user, and the
 * determinism work went into the parts that are actually variable.
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
    baseURL: 'http://localhost:3000',
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
      url: 'http://localhost:3003/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '3003',
        NODE_ENV: 'test',
        JWT_SECRET: 'e2e-fixture-secret-not-a-real-key',
      },
    },
    {
      name: 'web',
      command:
        'npm run build --workspace @animaforge/web && npm run start --workspace @animaforge/web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      /* The build dominates this; 5 minutes is a cold CI build with margin. */
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '3000',
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_AUTH_URL: 'http://localhost:3003',
      },
    },
  ],
});
