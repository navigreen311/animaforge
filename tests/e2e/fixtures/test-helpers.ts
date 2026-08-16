import { type Page, expect } from '@playwright/test';

import { E2E_USER } from './test-data';

/**
 * Log in through the real login form and wait until the app has actually
 * navigated away.
 *
 * The previous version ended with:
 *
 *     await page.waitForURL(/(?!.*\/login)/);
 *
 * which never waited for anything. A bare negative lookahead matches at
 * position 0 of every string, `/login` included, so the promise resolved
 * immediately and each caller raced the redirect. Waiting for the destination
 * is both correct and clearer about intent.
 */
export async function login(
  page: Page,
  email: string = E2E_USER.email,
  password: string = E2E_USER.password,
): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL('**/projects', { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
}

/**
 * Attempt a login that is expected to fail, and return once the app has
 * finished handling it.
 *
 * Waits for the submit button to become interactive again rather than for a
 * fixed delay: the form disables it for the duration of the request, so its
 * re-enabling is the app telling us the attempt resolved.
 */
export async function attemptLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  const submit = page.getByRole('button', { name: 'Sign In' });
  await submit.click();
  await expect(submit).toBeEnabled({ timeout: 15_000 });
}

/**
 * Open a project's detail page and wait for its title to render.
 *
 * `networkidle` is deliberately not used here. The dashboard polls
 * (`refetchInterval` of 5s and 30s on several queries), so the network never
 * goes idle and the wait would burn its full timeout on every call.
 */
export async function openProject(page: Page, projectId: string, title: string): Promise<void> {
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}
