import { test, expect } from './fixtures/test';
import { login } from './fixtures/test-helpers';
import { fixtureState, SIDEBAR_LINKS } from './fixtures/test-data';

test.describe('App navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('every sidebar link navigates to its route', async ({ page }) => {
    /*
     * Starts on /settings, which is not one of the links under test.
     *
     * Landing on /projects and then clicking "Projects" first was clicking the
     * link that already carries aria-current="page". That item re-renders as
     * the page's data arrives -- which it now does, since #82 made these pages
     * able to load -- and Playwright spent the full timeout on "element was
     * detached from the DOM, retrying". Starting off-list means no click ever
     * targets the active link, and every link is still exercised.
     */
    await page.goto('/settings');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    /*
     * Label and destination are asserted as a pair, from test-data. Two of
     * these do not match by name — "Script AI" goes to /script and "Style
     * Studio" to /style — and the previous spec asserted /script-ai and
     * /style-studio, both of which 404. It failed on the third link every run.
     */
    for (const { label, path } of SIDEBAR_LINKS) {
      const link = sidebar.getByRole('link', { name: label, exact: false }).first();
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL(`**${path}`);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test('project detail is reachable from the list', async ({ page }) => {
    /*
     * Unskipped by #82: the list has real rows to click now.
     *
     * A project card routes to that project's *timeline*, not to
     * /projects/<id> — ProjectCard pushes `/projects/${project.id}/timeline`
     * on click. So the assertion is that the card carries you into the right
     * project's routes, by id. Asserting a heading here would be asserting
     * against whatever the timeline renders, which is a different page's
     * concern; projects.spec.ts covers the detail page's own heading.
     */
    const { projectId, projectTitle } = fixtureState();

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();

    await page.getByText(projectTitle).first().click();

    await page.waitForURL(new RegExp(`/projects/${projectId}`), { timeout: 30_000 });
    expect(page.url()).toContain(projectId);
  });

  test('browser back returns to the previous route', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();

    /*
     * Navigates to another top-level route rather than a project detail page.
     * Detail pages render only their shell until #82 is fixed, so there is
     * nothing stable to wait on there — and this test is about history, not
     * about that page's content.
     */
    await page.goto('/marketplace');
    await expect(page).toHaveURL(/\/marketplace$/);

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
