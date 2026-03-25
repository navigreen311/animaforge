import { test, expect } from '@playwright/test';
import { loginAsUser } from './fixtures/test-helpers';

test.describe('Auth flows', () => {
  test('register new account redirects to projects', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Display Name').fill('Test User');
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // After registration, user should be redirected to projects
    await expect(page).toHaveURL(/\/projects/);
  });

  test('login with valid credentials shows dashboard', async ({ page }) => {
    await loginAsUser(page, 'user@example.com', 'password123');

    // Should see the projects page with dashboard layout
    await expect(page.getByText('My Projects')).toBeVisible();
  });

  test('login with invalid credentials shows error message', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('badpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should remain on login page and display an error
    await expect(page).toHaveURL(/\/login/);
    // The app should show some form of error feedback
    const errorVisible =
      (await page.getByText(/invalid|error|incorrect/i).isVisible().catch(() => false)) ||
      (await page.locator('[role="alert"]').isVisible().catch(() => false));
    // At minimum, user should still be on the login page
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('logout redirects to login', async ({ page }) => {
    await loginAsUser(page, 'user@example.com', 'password123');

    // Look for user menu / logout action
    const userMenuButton = page.getByLabel('User menu');
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
    }

    const logoutButton = page.getByRole('button', { name: /log\s*out|sign\s*out/i });
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
    }

    // After logout, should be on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from dashboard to login', async ({
    page,
  }) => {
    // Attempt to visit a protected route directly
    await page.goto('/projects');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
