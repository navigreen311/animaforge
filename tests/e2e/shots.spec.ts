import { test, expect } from './fixtures/test';
import { login } from './fixtures/test-helpers';
import { FIXTURE_PROJECT } from './fixtures/test-data';

const SHOT_EDITOR = `/projects/${FIXTURE_PROJECT.id}/shots/1`;

test.describe('Shot management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the shot editor renders every scene-graph field', async ({ page }) => {
    await page.goto(SHOT_EDITOR);

    await expect(page.getByRole('heading', { name: 'Shot Editor' })).toBeVisible();

    for (const label of [
      'Subject',
      'Camera Angle',
      'Camera Movement',
      'Action',
      'Emotion',
      'Duration (seconds)',
      'Dialogue',
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
  });

  test('scene-graph fields accept and retain input', async ({ page }) => {
    await page.goto(SHOT_EDITOR);
    await expect(page.getByRole('heading', { name: 'Shot Editor' })).toBeVisible();

    await page.getByLabel('Subject', { exact: true }).fill('Hero walks through a neon alley');
    await page.getByLabel('Camera Angle', { exact: true }).selectOption('Low Angle');
    await page.getByLabel('Camera Movement', { exact: true }).selectOption('Dolly In');
    await page.getByLabel('Action', { exact: true }).fill('Walking forward, looking around');
    await page.getByLabel('Emotion', { exact: true }).fill('determined');
    await page.getByLabel('Duration (seconds)', { exact: true }).fill('6');
    await page.getByLabel('Dialogue', { exact: true }).fill('This is where it all began.');

    await expect(page.getByLabel('Subject', { exact: true })).toHaveValue(
      'Hero walks through a neon alley',
    );
    await expect(page.getByLabel('Camera Angle', { exact: true })).toHaveValue('Low Angle');
    await expect(page.getByLabel('Camera Movement', { exact: true })).toHaveValue('Dolly In');
    await expect(page.getByLabel('Action', { exact: true })).toHaveValue(
      'Walking forward, looking around',
    );
    await expect(page.getByLabel('Emotion', { exact: true })).toHaveValue('determined');
    await expect(page.getByLabel('Duration (seconds)', { exact: true })).toHaveValue('6');
    await expect(page.getByLabel('Dialogue', { exact: true })).toHaveValue(
      'This is where it all began.',
    );
  });

  test.skip('the timeline route renders its inspector', async () => {
    /*
     * SKIPPED — this page cannot load data (#82).
     *
     * #79 moved the console onto platform-api and #83 wired the dashboard
     * pages to it. Every request forwards the browser's Authorization header;
     * the auth service issues a token carrying `userId` and platform-api's
     * middleware requires `sub`, so all of them answer 401
     * AUTH_TOKEN_MALFORMED and the page renders its shell with no content —
     * no heading, no tabs.
     *
     * Login itself still passes for real (auth.spec.ts). This is the data
     * path behind it, broken in services/, not here. Skipped rather than
     * softened into asserting an empty shell, which would hide the bug.
     */
  });
});
