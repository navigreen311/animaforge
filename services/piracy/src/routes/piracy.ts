import { Router, Request, Response } from 'express';
import {
  registerContent,
  scanPlatform,
  getAlerts,
  getAlert,
  updateAlertAction,
  getDashboard,
  ActionType,
} from '../services/piracyService';

export const piracyRouter = Router();

// POST /piracy/scan — scan URL/platform for unauthorized content
piracyRouter.post('/piracy/scan', (req: Request, res: Response) => {
  try {
    const { query, platforms } = req.body;

    if (!query || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'query and platforms[] are required' });
    }

    const allMatches: any[] = [];
    for (const platform of platforms) {
      const result = scanPlatform(query, platform);
      allMatches.push(...result.matches);
    }

    return res.json({
      query,
      platforms,
      total_matches: allMatches.length,
      matches: allMatches,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /piracy/register — register content for monitoring
piracyRouter.post('/piracy/register', (req: Request, res: Response) => {
  try {
    const { outputId, watermarkId, metadata } = req.body;

    if (!outputId || !watermarkId) {
      return res.status(400).json({ error: 'outputId and watermarkId are required' });
    }

    const content = registerContent(outputId, watermarkId, metadata || {});
    return res.status(201).json(content);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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

    const alert = updateAlertAction(req.params.id, action);
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
