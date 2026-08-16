import { test, expect } from './fixtures/test';
import { login } from './fixtures/test-helpers';
import { FIXTURE_PROJECT, SIDEBAR_LINKS } from './fixtures/test-data';

test.describe('App navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('every sidebar link navigates to its route', async ({ page }) => {
    await page.goto('/projects');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    /*
     * Label and destination are asserted as a pair, from test-data. Two of
     * these do not match by name — "Script AI" goes to /script and "Style
     * Studio" to /style — and the previous spec asserted /script-ai and
     * /style-studio, both of which 404. It failed on the third link every run.
     */
    for (const { label, path } of SIDEBAR_LINKS) {
      await sidebar.getByRole('link', { name: label, exact: false }).first().click();
      await page.waitForURL(`**${path}`);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test.skip('project detail is reachable from the list', async () => {
    /*
     * SKIPPED — the project list cannot load data (#82).
     *
     * Since #79 this list is served by /api/projects, which proxies to
     * platform-api and forwards the browser's Authorization header. The token
     * the auth service issues carries `userId`; platform-api's middleware
     * requires `sub`, so every request answers
     * 401 AUTH_TOKEN_MALFORMED and the list renders empty.
     *
     * The login itself works — that is asserted in auth.spec.ts. This is the
     * data path behind it, and it is broken in services/, not here. Skipped
     * rather than loosened into passing against an empty list, which would
     * hide exactly the bug this found.
     */
  });

  test('browser back returns to the previous route', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();

    await page.goto(`/projects/${FIXTURE_PROJECT.id}`);
    await expect(page.getByRole('heading', { name: FIXTURE_PROJECT.title })).toBeVisible();

    await page.goBack();

    /*
     * Waits for the destination heading rather than asserting the URL alone.
     * The URL changes before the client-side transition finishes, so a
     * URL-only assertion can pass while the previous page is still mounted.
     */
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
    await expect(page).toHaveURL(/\/projects$/);
  });
});
