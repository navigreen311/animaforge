import { request } from '@playwright/test';
import { writeFileSync } from 'node:fs';

import { AUTH_URL, PLATFORM_URL, E2E_USER, FIXTURE_STATE_PATH } from './test-data';

/**
 * Seed the fixture user and the data the specs assert on.
 *
 * Two things have to be true before any spec runs, and they are connected:
 *
 *   1. The fixture user exists and can log in. Registration goes through the
 *      service's own POST /auth/register rather than writing to a store
 *      directly, so the fixture cannot drift from the real path: if
 *      registration changes shape this breaks loudly here instead of producing
 *      a user that login silently rejects.
 *
 *   2. That user owns at least one project *in platform-api's database*. The
 *      specs assert on a project list, and until #82 the list was always empty
 *      — the auth service ran on an in-memory user store, so the `sub` in the
 *      token named nobody platform-api had ever heard of. Both services now
 *      share one database and one signing secret, so the token issued in step
 *      1 authenticates in step 2 and the row it creates belongs to the user
 *      the specs log in as.
 *
 * The created ids are written to a file the specs read, rather than pinned as
 * constants. A constant would either have to match whatever the seed happens
 * to produce or be inserted behind the API's back; creating through the API
 * means the fixture exercises the same path a user would.
 *
 * Idempotent: a 409 on register means the user already exists, which is what
 * happens when `reuseExistingServer` keeps a server alive between local runs.
 */

interface FixtureState {
  projectId: string;
  projectTitle: string;
  token: string;
  userId: string;
}

const FIXTURE_PROJECT_TITLE = 'E2E Fixture Project';

async function globalSetup(): Promise<void> {
  const api = await request.newContext();

  try {
    const response = await api.post(`${AUTH_URL}/auth/register`, {
      data: {
        email: E2E_USER.email,
        password: E2E_USER.password,
        displayName: E2E_USER.displayName,
      },
      failOnStatusCode: false,
    });

    const status = response.status();

    if (status === 201) {
      console.log(`[e2e setup] registered fixture user ${E2E_USER.email}`);
    } else if (status === 409) {
      console.log(`[e2e setup] fixture user ${E2E_USER.email} already present`);
    } else {
      throw new Error(
        `Could not seed the fixture user: ${AUTH_URL}/auth/register returned ` +
          `${status} ${await response.text()}`,
      );
    }

    /*
     * Prove the seeded credentials actually authenticate. Without this a
     * password-policy change would surface as five confusing spec failures
     * instead of one clear setup failure.
     */
    const login = await api.post(`${AUTH_URL}/auth/login`, {
      data: { email: E2E_USER.email, password: E2E_USER.password },
      failOnStatusCode: false,
    });

    if (login.status() !== 200) {
      throw new Error(
        `Seeded user cannot log in: /auth/login returned ${login.status()} ` +
          `${await login.text()}`,
      );
    }

    const { token, user } = (await login.json()) as {
      token: string;
      user: { id: string };
    };

    /*
     * The token the auth service just issued, used against platform-api. If
     * the two disagree about the signing secret or the subject claim, this is
     * where it surfaces — as one setup failure naming the status, rather than
     * as six specs quietly asserting against an empty page.
     */
    const created = await api.post(`${PLATFORM_URL}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: FIXTURE_PROJECT_TITLE,
        description: 'Created by tests/e2e/fixtures/global-setup.ts',
      },
      failOnStatusCode: false,
    });

    if (created.status() !== 201 && created.status() !== 200) {
      throw new Error(
        `The auth service's token was rejected by platform-api: ` +
          `POST /api/v1/projects returned ${created.status()} ${await created.text()}. ` +
          `Both services must share JWT_SECRET and the same DATABASE_URL — see ` +
          `playwright.config.ts and docs/auth.md.`,
      );
    }

    const body = (await created.json()) as { data: { id: string; title: string } };

    const state: FixtureState = {
      projectId: body.data.id,
      projectTitle: body.data.title,
      token,
      userId: user.id,
    };
    writeFileSync(FIXTURE_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');

    console.log(`[e2e setup] fixture project ${state.projectId} owned by ${state.userId}`);
  } finally {
    await api.dispose();
  }
}

export default globalSetup;
