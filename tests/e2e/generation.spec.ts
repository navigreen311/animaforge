import { test, expect } from './fixtures/test';
import { login } from './fixtures/test-helpers';
import { FIXTURE_PROJECT } from './fixtures/test-data';

const SHOT_EDITOR = `/projects/${FIXTURE_PROJECT.id}/shots/1`;

test.describe('Generation flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('generate is gated on the shot having a subject', async ({ page }) => {
    await page.goto(SHOT_EDITOR);

    const generate = page.getByRole('button', { name: 'Generate Shot' });

    /* Disabled while Subject is empty, enabled once it is filled. */
    await expect(generate).toBeVisible();
    await expect(generate).toBeDisabled();

    await page.getByLabel('Subject', { exact: true }).fill('Hero walks through a neon alley');
    await expect(generate).toBeEnabled();
  });

  test('generating a shot puts the button into its in-progress state', async ({ page }) => {
    await page.goto(SHOT_EDITOR);

    await page.getByLabel('Subject', { exact: true }).fill('Hero walks through a neon alley');
    await page.getByRole('button', { name: 'Generate Shot' }).click();

    /*
     * The button relabels itself to "Generating...". Asserting that exact
     * transition is the whole observable outcome of a generate click in this
     * build: the request goes to the AI API, which is not part of this
     * harness, so nothing further arrives.
     *
     * The old spec searched the page for /generating/i, which the sidebar's
     * "Generating" project-status filter chip already matches on every route
     * — so it passed without the button ever changing.
     */
    await expect(page.getByRole('button', { name: 'Generating...' })).toBeVisible();
  });

  test.skip('a queued job appears in the job queue', async () => {
    /*
     * SKIPPED — nothing consumes the generate request in this harness.
     *
     * Submitting posts to the AI API on :8001, which the e2e stack does not
     * start; the job queue is served from apps/web/src/lib/mockData.ts and
     * never reflects a request made during a test run. The original spec hid
     * this behind nested `if (isVisible)` branches that made it pass whether
     * a job appeared or not.
     *
     * Enabling this needs the AI API in the harness and /api/jobs backed by
     * real state. Tracked in #80.
     */
  });
});
