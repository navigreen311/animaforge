/**
 * Fixture data for the e2e suite.
 *
 * Everything the specs assert on is pinned here so a spec never depends on
 * "whatever happens to be first in the list".
 *
 * The project used to be a constant mirroring apps/web/src/lib/mockData.ts,
 * because the Next route handlers served that file and there was no database
 * behind the pages. Both have changed: #79 moved the routes onto platform-api
 * and #82 made the auth service's token work against it. The fixture project
 * is now created through the API by global-setup, owned by the user the specs
 * log in as, and its id is read back from disk here.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const AUTH_URL =
  process.env.E2E_AUTH_URL ?? `http://localhost:${process.env.E2E_AUTH_PORT ?? '3003'}`;

export const PLATFORM_URL =
  process.env.E2E_PLATFORM_URL ?? `http://localhost:${process.env.E2E_PLATFORM_PORT ?? '4000'}`;

/** Where global-setup leaves the ids it created. */
export const FIXTURE_STATE_PATH = path.join(__dirname, '.fixture-state.json');

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

/** The tabs the project detail page renders. These are static UI, not data. */
export const PROJECT_TABS = [
  'Timeline',
  'Characters',
  'Shots',
  'Review',
  'Assets',
  'Analytics',
] as const;

export interface FixtureState {
  projectId: string;
  projectTitle: string;
  token: string;
  userId: string;
}

/**
 * The project global-setup created, read from disk.
 *
 * Throws rather than returning a placeholder: a spec that silently asserts
 * against an id that was never created is the failure mode this whole file
 * exists to avoid.
 */
export function fixtureState(): FixtureState {
  if (!existsSync(FIXTURE_STATE_PATH)) {
    throw new Error(
      `No fixture state at ${FIXTURE_STATE_PATH}. tests/e2e/fixtures/global-setup.ts ` +
        `writes it before any spec runs — if it is missing, global setup did not complete.`,
    );
  }
  return JSON.parse(readFileSync(FIXTURE_STATE_PATH, 'utf-8')) as FixtureState;
}

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
