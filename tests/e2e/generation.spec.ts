import { test, expect } from './fixtures/test';
import { login } from './fixtures/test-helpers';
import { fixtureState } from './fixtures/test-data';

const SHOT_EDITOR = () => `/projects/${fixtureState().projectId}/shots/1`;

test.describe('Generation flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('generate is gated on the shot having a subject', async ({ page }) => {
    await page.goto(SHOT_EDITOR());

    const generate = page.getByRole('button', { name: 'Generate Shot' });

    /* Disabled while Subject is empty, enabled once it is filled. */
    await expect(generate).toBeVisible();
    await expect(generate).toBeDisabled();

    await page.getByLabel('Subject', { exact: true }).fill('Hero walks through a neon alley');
    await expect(generate).toBeEnabled();
  });

  test('generating a shot puts the button into its in-progress state', async ({ page }) => {
    await page.goto(SHOT_EDITOR());

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

  test('a submitted job appears in the render queue as queued', async ({ page }) => {
    /*
     * Unskipped by #80, which added the producer the pipeline was missing:
     * POST /api/jobs writes the generation_jobs row as `queued` and puts the
     * work on the BullMQ queue under that row's id.
     *
     * The submission goes through the browser's own session rather than the
     * shot editor's Generate button. That button posts to
     * /api/shots/[id]/generate, which is still a 501 naming services/ai-api as
     * the missing dependency — a service this harness does not start and this
     * change does not own. Driving the button would therefore assert nothing
     * about the queue. What is asserted here is the flow that now exists end
     * to end: submit -> queued -> visible in /render-queue.
     */
    const { projectId, projectTitle } = fixtureState();

    await page.goto('/render-queue');

    const submitted = await page.evaluate(async (id) => {
      const token = localStorage.getItem('animaforge_token');
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'video',
          projectId: id,
          params: { prompt: 'e2e queued job' },
        }),
      });
      return { status: res.status, body: await res.json() };
    }, projectId);

    // Assert the submission itself, so a queue outage reads as a queue outage
    // rather than as "the row never showed up".
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(201);
    expect(submitted.body.status).toBe('queued');

    await page.reload();

    /*
     * Asserted on the "Queued (n)" tab, which is computed from the fetched
     * jobs, rather than on a row carrying the project name.
     *
     * The queued *list* underneath cannot show the job, and not for any reason
     * to do with this change. render-queue/page.tsx renders that section as:
     *
     *     {queuedJobs.length > 0 && (
     *       <div><h2>Queued</h2><p>No jobs in queue</p></div>
     *     )}
     *
     * — the section appears only when there are queued jobs, and its body is a
     * hardcoded "No jobs in queue". So with jobs queued the page counts them
     * correctly and then says there are none. That page belongs to another
     * owner; it is reported rather than edited here, and the count is asserted
     * because it is the part of the queue UI that reflects real data.
     */
    await expect(page.getByRole('button', { name: /^Queued \(\d+\)$/ })).toBeVisible({
      timeout: 30_000,
    });
    const label = await page.getByRole('button', { name: /^Queued \(\d+\)$/ }).textContent();
    expect(Number(/\((\d+)\)/.exec(label ?? '')?.[1] ?? 0)).toBeGreaterThan(0);
  });
});
