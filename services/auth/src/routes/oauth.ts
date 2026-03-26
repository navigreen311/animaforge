/**
 * AnimaForge — OAuth routes
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  getAuthorizationUrl,
  exchangeCode,
  getUserInfo,
  findOrCreateOAuthUser,
  availableProviders,
} from '../services/oauthService';

const router = Router();

// -----------------------------------------------------------------------
// GET /auth/oauth/providers — list configured OAuth providers
// -----------------------------------------------------------------------
router.get('/auth/oauth/providers', (_req: Request, res: Response) => {
  res.json({ providers: availableProviders() });
});

// -----------------------------------------------------------------------
// GET /auth/oauth/:provider — redirect to provider authorization page
// -----------------------------------------------------------------------
router.get('/auth/oauth/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in session / cookie for CSRF verification (simplified here)
  (req as any).session = (req as any).session || {};
  (req as any).session.oauthState = state;

  const url = getAuthorizationUrl(provider, state);

  if (!url) {
    res.status(400).json({ error: `OAuth provider "${provider}" is not configured` });
    return;
  }

  res.redirect(url);
});

// -----------------------------------------------------------------------
// GET /auth/oauth/:provider/callback — handle provider callback
// -----------------------------------------------------------------------
router.get(
  '/auth/oauth/:provider/callback',
  async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { code, error } = req.query;

    if (error) {
      res.status(400).json({ error: `OAuth error: ${error}` });
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCode(provider, code);
    if (!tokens) {
      res.status(401).json({ error: 'Failed to exchange authorization code' });
      return;
    }

    // Fetch user info from provider
    const userInfo = await getUserInfo(provider, tokens.accessToken);
    if (!userInfo) {
      res.status(401).json({ error: 'Failed to retrieve user info from provider' });
      return;
    }

    // Find or create user in our database
    const user = await findOrCreateOAuthUser(userInfo);

    // In production this would issue a JWT and set cookies.
    // For now, return the user object.
    res.json({ user, provider });
  },
);

export default router;
