import { test, expect } from './fixtures/test';
import { attemptLogin, login } from './fixtures/test-helpers';
import { BAD_USER, E2E_USER } from './fixtures/test-data';

/**
 * These run against the real auth service on :3003, not a stub. The password
 * is compared with bcrypt and a real JWT comes back; the fixture user is
 * registered by global-setup through the service's own /auth/register.
 */
test.describe('Auth flows', () => {
  test('login with valid credentials lands on the dashboard', async ({ page }) => {
    await login(page, E2E_USER.email, E2E_USER.password);

    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  });

  test('login with invalid credentials shows the service error', async ({ page }) => {
    await attemptLogin(page, BAD_USER.email, BAD_USER.password);

    /*
     * Asserts the exact string the auth service returns, not a loose
     * /invalid|error/i match. The old spec accepted almost anything and then
     * fell back to "at least the Sign In button is still visible", which
     * passes even when no error is reported at all.
     *
     * Matched by text rather than by role: the login page renders the message
     * in a plain styled div with no role="alert", and getByRole('alert')
     * resolves to Next's own empty #__next-route-announcer__ instead.
     */
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('register creates an account and redirects to projects', async ({ page }) => {
    /*
     * Unique per run. The auth service keeps users in memory, so a fixed
     * address would 409 on the second run against a reused server.
     */
    const email = `e2e-signup-${Date.now()}@animaforge.test`;

    await page.goto('/register');
    await page.getByLabel('Display Name').fill('E2E Signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('E2ePassw0rd!');
    await page.getByLabel('Confirm Password').fill('E2ePassw0rd!');
    await page.getByLabel(/I agree to the Terms/).check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/projects', { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  });

  test('logout returns the user to the login page', async ({ page }) => {
    await login(page);

    // The avatar opens a real menu now (#80). It used to be a button whose
    // onClick body was a TODO comment, so there was nothing to click through.
    await page.getByRole('button', { name: 'User menu' }).click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    await menu.getByRole('menuitem', { name: /sign out/i }).click();

    await page.waitForURL('**/login', { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // Signed out for real, not just navigated: going back to a protected route
    // must not let them in.
    await page.goto('/projects');
    await page.waitForURL(/\/login/, { timeout: 30_000 });
  });

  test('unauthenticated visitor is redirected away from the dashboard', async ({ page }) => {
    // apps/web/src/middleware.ts, added in #80. Before it there was no
    // middleware at all and a signed-out visitor got /projects with a 200.
    await page.goto('/projects');

    await page.waitForURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // The route they asked for is carried, so signing in returns them to it.
    expect(new URL(page.url()).searchParams.get('next')).toBe('/projects');
  });

  test('signing in returns the visitor to the route they asked for', async ({ page }) => {
    await page.goto('/characters');
    await page.waitForURL(/\/login/, { timeout: 30_000 });

    await page.getByLabel('Email').fill(E2E_USER.email);
    await page.getByLabel('Password').fill(E2E_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('**/characters', { timeout: 30_000 });
  });
});
