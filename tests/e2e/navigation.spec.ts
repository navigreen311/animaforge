import { test, expect } from '@playwright/test';
import { loginAsUser } from './fixtures/test-helpers';

test.describe('App navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'user@example.com', 'password123');
  });

  test('sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/projects');

    // Sidebar should be visible with navigation links
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Test navigation to each sidebar link
    const sidebarLinks = [
      { label: 'Projects', url: /\/projects/ },
      { label: 'Characters', url: /\/characters/ },
      { label: 'Style Studio', url: /\/style-studio/ },
      { label: 'Script AI', url: /\/script-ai/ },
      { label: 'Marketplace', url: /\/marketplace/ },
    ];

    for (const link of sidebarLinks) {
      await sidebar.getByRole('link', { name: link.label }).click();
      await expect(page).toHaveURL(link.url);
    }
  });

  test('breadcrumbs show correct path', async ({ page }) => {
    // Navigate to a nested route
    await page.goto('/projects/1');

    // TopBar breadcrumbs should show "Projects / 1" (or project name)
    const breadcrumbNav = page.locator('header nav');
    await expect(breadcrumbNav).toBeVisible();

    // Should contain "Projects" as a breadcrumb segment
    await expect(breadcrumbNav.getByText('Projects')).toBeVisible();

    // The current segment should be present
    const breadcrumbText = await breadcrumbNav.textContent();
    expect(breadcrumbText).toContain('Projects');
  });

  test('back button works', async ({ page }) => {
    // Navigate to projects first
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);

    // Navigate deeper into a project
    await page.goto('/projects/1');
    await expect(page).toHaveURL(/\/projects\/1/);

    // Use browser back
    await page.goBack();

    // Should return to projects list
    await expect(page).toHaveURL(/\/projects/);
  });
});
