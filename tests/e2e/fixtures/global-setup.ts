import { request } from '@playwright/test';

import { AUTH_URL, E2E_USER } from './test-data';

/**
 * Seed the fixture user before any spec runs.
 *
 * The auth service is real — it hashes the password with bcrypt and issues a
 * signed JWT — but it falls back to an in-memory user store when Prisma has no
 * database, which is how it runs here. That store starts empty on every boot,
 * so the user has to be created before the login specs can use it.
 *
 * Seeding goes through the service's own POST /auth/register rather than
 * writing to a store directly. That way the fixture cannot drift from the
 * real registration path: if registration changes shape, this breaks loudly
 * here instead of producing a user that login silently rejects.
 *
 * Idempotent: a 409 means the user already exists, which is the expected
 * result when `reuseExistingServer` keeps a server alive between local runs.
 */
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
  } finally {
    await api.dispose();
  }
}

export default globalSetup;
