import { Router, Request, Response } from 'express';
import {
  createSession,
  startStream,
  stopStream,
  processInput,
  getSessionMetrics,
  getSession,
  getActiveSessions,
  serializeSession,
  SessionMode,
} from '../services/liveService';

export const liveRouter = Router();

// POST /live/session — create live session
liveRouter.post('/live/session', (req: Request, res: Response) => {
  try {
    const { projectId, avatarId, mode } = req.body;

    if (!projectId || !avatarId || !mode) {
      return res.status(400).json({ error: 'projectId, avatarId, and mode are required' });
    }

    const validModes: SessionMode[] = ['interactive', 'broadcast', 'rehearsal'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `mode must be one of: ${validModes.join(', ')}` });
    }

    const session = createSession({ projectId, avatarId, mode });
    return res.status(201).json(serializeSession(session));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /live/session/:id/start — start streaming
liveRouter.put('/live/session/:id/start', (req: Request, res: Response) => {
  try {
    const session = startStream(req.params.id);
    return res.json(serializeSession(session));
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
});

// PUT /live/session/:id/stop — stop streaming
liveRouter.put('/live/session/:id/stop', (req: Request, res: Response) => {
  try {
    const session = stopStream(req.params.id);
    return res.json(serializeSession(session));
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
});

// GET /live/session/:id — session status
liveRouter.get('/live/session/:id', (req: Request, res: Response) => {
  const session = getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  return res.json(serializeSession(session));
});

// POST /live/session/:id/input — send real-time input
liveRouter.post('/live/session/:id/input', (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (!type || data === undefined) {
      return res.status(400).json({ error: 'type and data are required' });
    }

    const result = processInput(req.params.id, { type, data });
    return res.json(result);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
});

// GET /live/sessions — list active sessions
liveRouter.get('/live/sessions', (_req: Request, res: Response) => {
  const sessions = getActiveSessions().map(serializeSession);
  return res.json({ sessions, count: sessions.length });
});

// GET /live/session/:id/metrics — session metrics
liveRouter.get('/live/session/:id/metrics', (req: Request, res: Response) => {
  try {
    const metrics = getSessionMetrics(req.params.id);
    return res.json(metrics);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});
