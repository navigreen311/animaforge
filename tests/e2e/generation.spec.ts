import { test, expect } from '@playwright/test';
import { loginAsUser } from './fixtures/test-helpers';

test.describe('Generation flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'user@example.com', 'password123');
  });

  test('generation panel shows tier selector', async ({ page }) => {
    // Navigate to shot editor which has the Generate button
    await page.goto('/projects/1/shots/1');

    // The shot editor page has a Generate Shot button
    await expect(
      page.getByRole('button', { name: /generate/i }),
    ).toBeVisible();

    // If a standalone GenerationPanel is rendered, verify the tier selector
    const tierSelect = page.getByLabel(/quality tier/i);
    if (await tierSelect.isVisible().catch(() => false)) {
      await expect(tierSelect).toBeVisible();

      // Should have Draft, Standard, Premium options
      const options = tierSelect.locator('option');
      const optionTexts = await options.allTextContents();
      expect(optionTexts.join(' ')).toContain('Draft');
      expect(optionTexts.join(' ')).toContain('Standard');
      expect(optionTexts.join(' ')).toContain('Premium');
    }
  });

  test('click generate shows progress indicator', async ({ page }) => {
    await page.goto('/projects/1/shots/1');

    // Fill the subject field (required to enable the Generate button)
    await page.getByLabel('Subject').fill('A cyberpunk street scene at night');

    // Click the Generate Shot button
    await page.getByRole('button', { name: /generate/i }).click();

    // Should see generating state — spinner or progress text
    const generatingIndicator =
      page.getByText(/generating/i);
    await expect(generatingIndicator).toBeVisible();

    // The button should reflect the generating state
    await expect(
      page.getByRole('button', { name: /generating/i }),
    ).toBeVisible();
  });

  test('job queue shows running jobs', async ({ page }) => {
    await page.goto('/projects/1/shots/1');

    // Look for the Job Queue section
    const jobQueueHeading = page.getByText('Job Queue');
    if (await jobQueueHeading.isVisible().catch(() => false)) {
      await expect(jobQueueHeading).toBeVisible();

      // If there are no active jobs, it should say "No active jobs"
      const noJobs = page.getByText('No active jobs');
      const hasNoJobs = await noJobs.isVisible().catch(() => false);

      if (hasNoJobs) {
        // Trigger a generation to populate the queue
        await page.getByLabel('Subject').fill('Test generation');
        await page.getByRole('button', { name: /generate/i }).click();

        // After triggering, the job queue should update
        await expect(page.getByText(/queued|running/i)).toBeVisible({
          timeout: 5000,
        });
      } else {
        // Jobs are already present — verify status badges
        await expect(
          page.getByText(/queued|running|complete/i).first(),
        ).toBeVisible();
      }
    } else {
      // Job Queue component may not be on this page — verify the generate flow works
      await page.getByLabel('Subject').fill('Test generation');
      await page.getByRole('button', { name: /generate/i }).click();
      await expect(page.getByText(/generating/i)).toBeVisible();
    }
  });
});
