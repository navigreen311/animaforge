/**
 * Fixture data for the e2e suite.
 *
 * Everything the specs assert on is pinned here so a spec never depends on
 * "whatever happens to be first in the list". The project values mirror
 * apps/web/src/lib/mockData.ts, which is what the Next route handlers serve —
 * there is no database behind the pages under test.
 */

export const AUTH_URL =
  process.env.E2E_AUTH_URL ?? `http://localhost:${process.env.E2E_AUTH_PORT ?? '3003'}`;

/** Registered by tests/e2e/fixtures/global-setup.ts before any spec runs. */
export const E2E_USER = {
  email: 'e2e@animaforge.test',
  password: 'E2ePassw0rd!',
  displayName: 'E2E User',
} as const;

/** Credentials guaranteed not to exist, for the failure path. */
export const BAD_USER = {
  email: 'nobody@animaforge.test',
  password: 'definitely-not-the-password',
} as const;

/** First project in MOCK_PROJECTS; the detail page renders its title as an h1. */
export const FIXTURE_PROJECT = {
  id: 'proj_cyber_samurai',
  title: 'Cyber Samurai: Origin',
  tabs: ['Timeline', 'Characters', 'Shots', 'Review', 'Assets', 'Analytics'],
} as const;

/**
 * Sidebar entries, as label plus the path they actually navigate to.
 *
 * The labels and the routes do not match, which is worth stating rather than
 * quietly encoding: "Script AI" goes to /script and "Style Studio" to /style.
 * The previous navigation spec asserted /script-ai and /style-studio, both of
 * which 404.
 */
export const SIDEBAR_LINKS = [
  { label: 'Projects', path: '/projects' },
  { label: 'Characters', path: '/characters' },
  { label: 'Script AI', path: '/script' },
  { label: 'Style Studio', path: '/style' },
  { label: 'Marketplace', path: '/marketplace' },
] as const;
