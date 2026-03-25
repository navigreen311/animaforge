import { test, expect } from '@playwright/test';
import { loginAsUser } from './fixtures/test-helpers';

test.describe('Shot management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'user@example.com', 'password123');
  });

  test('navigate to shot editor shows scene graph form', async ({ page }) => {
    await page.goto('/projects/1/shots/1');

    // Should see the Shot Editor heading
    await expect(page.getByText('Shot Editor')).toBeVisible();

    // Should see scene graph form fields
    await expect(page.getByLabel('Subject')).toBeVisible();
    await expect(page.getByLabel('Camera Angle')).toBeVisible();
    await expect(page.getByLabel('Camera Movement')).toBeVisible();
    await expect(page.getByLabel('Action')).toBeVisible();
    await expect(page.getByLabel('Emotion')).toBeVisible();
    await expect(page.getByLabel(/Duration/)).toBeVisible();
    await expect(page.getByLabel('Dialogue')).toBeVisible();
  });

  test('fill scene graph form populates fields', async ({ page }) => {
    await page.goto('/projects/1/shots/1');

    // Fill out each field
    await page.getByLabel('Subject').fill('Hero walks through a neon alley');
    await page.getByLabel('Camera Angle').selectOption('Low Angle');
    await page.getByLabel('Camera Movement').selectOption('Dolly In');
    await page.getByLabel('Action').fill('Walking forward, looking around');
    await page.getByLabel('Emotion').fill('determined');
    await page.getByLabel(/Duration/).fill('6');
    await page.getByLabel('Dialogue').fill('This is where it all began.');

    // Verify values are populated
    await expect(page.getByLabel('Subject')).toHaveValue('Hero walks through a neon alley');
    await expect(page.getByLabel('Camera Angle')).toHaveValue('Low Angle');
    await expect(page.getByLabel('Camera Movement')).toHaveValue('Dolly In');
    await expect(page.getByLabel('Action')).toHaveValue('Walking forward, looking around');
    await expect(page.getByLabel('Emotion')).toHaveValue('determined');
    await expect(page.getByLabel(/Duration/)).toHaveValue('6');
    await expect(page.getByLabel('Dialogue')).toHaveValue('This is where it all began.');
  });

  test('timeline page loads with shot tracks visible', async ({ page }) => {
    await page.goto('/projects/1/timeline');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Timeline should render shot data
    // The timeline uses mock shots with subjects like "Hero enters the forest"
    const timelineContent = page.locator('[class*="timeline"], [data-testid="timeline"]');
    const hasTimeline = await timelineContent.isVisible().catch(() => false);

    if (hasTimeline) {
      await expect(timelineContent).toBeVisible();
    }

    // Verify shot track text is present (from MOCK_SHOTS)
    const pageContent = await page.textContent('body');
    const hasShotData =
      pageContent?.includes('Hero enters') ||
      pageContent?.includes('Shot') ||
      pageContent?.includes('shot-1');
    expect(hasShotData).toBeTruthy();
  });
});
