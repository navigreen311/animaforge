import { Router, Request, Response } from 'express';
import {
  registerContent,
  registerContentWithAsset,
  scanPlatform,
  matchSuppliedAsset,
  getAlerts,
  updateAlertAction,
  getDashboard,
  getCapabilities,
  ActionType,
} from '../services/piracyService';

export const piracyRouter = Router();

function assetFrom(body: Record<string, unknown>): {
  asset_base64?: string;
  asset_path?: string;
  mime_type?: string;
} | null {
  const asset_base64 = typeof body.asset_base64 === 'string' ? body.asset_base64 : undefined;
  const asset_path = typeof body.asset_path === 'string' ? body.asset_path : undefined;
  const mime_type = typeof body.mime_type === 'string' ? body.mime_type : undefined;
  if (!asset_base64 && !asset_path) return null;
  return { asset_base64, asset_path, mime_type };
}

// POST /piracy/scan — discover and fingerprint candidate copies
piracyRouter.post('/piracy/scan', async (req: Request, res: Response) => {
  try {
    const { query, platforms } = req.body;

    if (!query || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'query and platforms[] are required' });
    }

    const allMatches: unknown[] = [];
    const reasons = new Set<string>();
    let examined = 0;
    let fingerprinted = 0;

    for (const platform of platforms) {
      const result = await scanPlatform(query, platform);
      allMatches.push(...result.matches);
      examined += result.candidates_examined;
      fingerprinted += result.candidates_fingerprinted;
      for (const reason of result.reasons) reasons.add(reason);
    }

    return res.json({
      query,
      platforms,
      total_matches: allMatches.length,
      matches: allMatches,
      candidates_examined: examined,
      candidates_fingerprinted: fingerprinted,
      degraded: reasons.size > 0,
      reasons: [...reasons],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /piracy/match — fingerprint a supplied asset against registered content
piracyRouter.post('/piracy/match', async (req: Request, res: Response) => {
  const asset = assetFrom(req.body ?? {});
  if (!asset) {
    return res.status(400).json({
      error: 'asset_base64 or asset_path is required to fingerprint an asset',
    });
  }
  try {
    const threshold = typeof req.body.threshold === 'number' ? req.body.threshold : undefined;
    return res.json(await matchSuppliedAsset(asset, threshold));
  } catch (err: any) {
    return res.status(422).json({ error: err.message });
  }
});

// POST /piracy/register — register content for monitoring
piracyRouter.post('/piracy/register', async (req: Request, res: Response) => {
  try {
    const { outputId, watermarkId, metadata, userId } = req.body;

    if (!outputId || !watermarkId) {
      return res.status(400).json({ error: 'outputId and watermarkId are required' });
    }

    const asset = assetFrom(req.body ?? {});
    if (!asset) {
      // Registering without media is allowed but useless for matching, so the
      // response says so rather than implying the content is protected.
      const content = registerContent(outputId, watermarkId, metadata || {}, userId);
      return res.status(201).json({
        ...content,
        fingerprinted: false,
        warning:
          'No asset supplied, so no perceptual fingerprint was computed. This content ' +
          'cannot be matched by a scan. Send asset_base64 or asset_path to fingerprint it.',
      });
    }

    const content = await registerContentWithAsset(
      outputId,
      watermarkId,
      asset,
      metadata || {},
      userId,
    );
    return res.status(201).json({ ...content, fingerprinted: true });
  } catch (err: any) {
    return res.status(422).json({ error: err.message });
  }
});

// GET /piracy/alerts — list piracy alerts
piracyRouter.get('/piracy/alerts', (_req: Request, res: Response) => {
  const alertList = getAlerts();
  return res.json({ alerts: alertList, count: alertList.length });
});

// PUT /piracy/alerts/:id/action — take action on alert
piracyRouter.put('/piracy/alerts/:id/action', (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    const validActions: ActionType[] = ['dmca', 'ignore', 'monitor'];

    if (!action || !validActions.includes(action)) {
      return res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
    }

    const alert = updateAlertAction(String(req.params.id), action);
    return res.json(alert);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
});

// GET /piracy/dashboard — monitoring dashboard stats
piracyRouter.get('/piracy/dashboard', (_req: Request, res: Response) => {
  const stats = getDashboard();
  return res.json(stats);
});

// GET /piracy/capabilities — true state of every optional dependency
piracyRouter.get('/piracy/capabilities', async (_req: Request, res: Response) => {
  return res.json(await getCapabilities());
});
