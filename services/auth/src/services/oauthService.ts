/**
 * AnimaForge — OAuth service (Google + GitHub)
 *
 * Gracefully returns null when the required env vars for a provider
 * are not configured, so the server can still boot in minimal mode.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OAuthUserInfo {
  provider: string;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

// ---------------------------------------------------------------------------
// Provider configurations
// ---------------------------------------------------------------------------

function getProviderConfig(provider: string): ProviderConfig | null {
  switch (provider) {
    case 'google': {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile'],
      };
    }
    case 'github': {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email'],
      };
    }
    default:
      return null;
  }
}

const REDIRECT_BASE =
  process.env.OAUTH_REDIRECT_BASE || 'http://localhost:3003';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the authorization redirect URL for the given provider.
 * Returns null when the provider is not configured.
 */
export function getAuthorizationUrl(
  provider: string,
  state: string,
): string | null {
  const cfg = getProviderConfig(provider);
  if (!cfg) return null;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: `${REDIRECT_BASE}/auth/oauth/${provider}/callback`,
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state,
  });

  return `${cfg.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 * Returns null when the provider is not configured or the exchange fails.
 */
export async function exchangeCode(
  provider: string,
  code: string,
): Promise<{ accessToken: string; tokenType: string } | null> {
  const cfg = getProviderConfig(provider);
  if (!cfg) return null;

  try {
    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: `${REDIRECT_BASE}/auth/oauth/${provider}/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await res.json();

    const accessToken = data.access_token;
    if (!accessToken) return null;

    return { accessToken, tokenType: data.token_type ?? 'bearer' };
  } catch {
    return null;
  }
}

/**
 * Fetch the authenticated user's profile from the provider API.
 */
export async function getUserInfo(
  provider: string,
  accessToken: string,
): Promise<OAuthUserInfo | null> {
  const cfg = getProviderConfig(provider);
  if (!cfg) return null;

  try {
    const res = await fetch(cfg.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (provider === 'google') {
      return {
        provider: 'google',
        providerId: data.id,
        email: data.email,
        displayName: data.name ?? data.email,
        avatarUrl: data.picture ?? null,
      };
    }

    if (provider === 'github') {
      // GitHub may not include email in the user response
      let email = data.email as string | null;
      if (!email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails: Array<{ email: string; primary: boolean }> =
          await emailRes.json();
        email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? null;
      }

      return {
        provider: 'github',
        providerId: String(data.id),
        email: email ?? '',
        displayName: data.name ?? data.login ?? '',
        avatarUrl: data.avatar_url ?? null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Locate an existing user by OAuth provider + id, or create a new record.
 *
 * This is a thin wrapper that delegates to whatever user-store is available.
 * Returns the user object (shape depends on your User model).
 */
export async function findOrCreateOAuthUser(
  userInfo: OAuthUserInfo,
): Promise<Record<string, unknown>> {
  // In a real implementation this would call the DB layer, e.g.:
  //   const existing = await db.user.findFirst({
  //     where: { oauthProvider: userInfo.provider, oauthId: userInfo.providerId },
  //   });
  //   if (existing) return existing;
  //   return db.user.create({ data: { ... } });
  //
  // Placeholder until the DB client is wired up:
  return {
    id: `oauth-${userInfo.provider}-${userInfo.providerId}`,
    email: userInfo.email,
    displayName: userInfo.displayName,
    avatarUrl: userInfo.avatarUrl,
    provider: userInfo.provider,
    providerId: userInfo.providerId,
  };
}

/**
 * List providers whose env vars are configured and therefore available.
 */
export function availableProviders(): string[] {
  const providers: string[] = [];
  if (getProviderConfig('google')) providers.push('google');
  if (getProviderConfig('github')) providers.push('github');
  return providers;
}
