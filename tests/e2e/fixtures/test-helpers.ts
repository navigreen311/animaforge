import { type Page, expect } from '@playwright/test';

/**
 * Log in as a user via the login page.
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Wait for navigation away from login
  await page.waitForURL(/(?!.*\/login)/);
}

/**
 * Create a new project via the projects page modal.
 * Returns the title that was used.
 */
export async function createProject(
  page: Page,
  title: string,
): Promise<string> {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByLabel('Project Title').fill(title);
  await page.getByLabel('Description').fill(`E2E test project: ${title}`);
  await page.getByRole('button', { name: 'Create Project' }).click();
  return title;
}

/**
 * Navigate to a specific project's detail page.
 */
export async function navigateToProject(
  page: Page,
  projectId: string,
): Promise<void> {
  await page.goto(`/projects/${projectId}`);
  await page.waitForLoadState('networkidle');
}
