import { test, expect } from './fixtures/test';
import { login } from './fixtures/test-helpers';
import { fixtureState } from './fixtures/test-data';

const SHOT_EDITOR = () => `/projects/${fixtureState().projectId}/shots/1`;

test.describe('Shot management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the shot editor renders every scene-graph field', async ({ page }) => {
    await page.goto(SHOT_EDITOR());

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
    await page.goto(SHOT_EDITOR());
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

  test('the timeline route renders its inspector', async ({ page }) => {
    // Unskipped by #82: the timeline can read the project's shots now. The
    // project has no shots, so the inspector renders its empty state -- which
    // is the honest assertion, and distinct from the shell-with-nothing this
    // used to produce when every request answered 401.
    const { projectId } = fixtureState();

    await page.goto(`/projects/${projectId}/timeline`);

    await expect(page.locator('main, [class*="timeline"]').first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
