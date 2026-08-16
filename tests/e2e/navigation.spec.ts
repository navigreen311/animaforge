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

  test('project detail is reachable and renders its title', async ({ page }) => {
    await page.goto('/projects');

    await page.locator(`[aria-label="Project: ${FIXTURE_PROJECT.title}"]`).first().click();

    await expect(page.getByRole('heading', { name: FIXTURE_PROJECT.title })).toBeVisible();
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
