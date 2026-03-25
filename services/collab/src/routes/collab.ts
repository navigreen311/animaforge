import { Router, type Request, type Response } from 'express';
import { collabService } from '../services/collabService.js';
import { lockManager } from '../index.js';

export const collabRouter = Router();

/** GET /collab/sessions - list active collaboration sessions */
collabRouter.get('/collab/sessions', (_req: Request, res: Response) => {
  const sessions = collabService.getActiveSessions();
  res.json({ sessions });
});

/** GET /collab/sessions/:projectId - session details including users, locks, activity */
collabRouter.get('/collab/sessions/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const details = collabService.getSessionDetails(projectId, () => lockManager.getAllLocks());
  if (!details) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(details);
});

/** POST /collab/sessions/:projectId/invite - invite a user to a collaboration session */
collabRouter.post('/collab/sessions/:projectId/invite', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { userId, role } = req.body ?? {};
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  const invite = collabService.inviteUser(projectId, userId, role || 'edit');
  res.status(201).json(invite);
});

/** GET /collab/history/:projectId - edit history log */
collabRouter.get('/collab/history/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const history = collabService.getEditHistory(projectId, limit);
  res.json({ projectId, history });
});

/** POST /collab/sessions/:projectId/permissions - set user permissions */
collabRouter.post('/collab/sessions/:projectId/permissions', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { userId, role } = req.body ?? {};
  if (!userId || !role) {
    res.status(400).json({ error: 'userId and role are required' });
    return;
  }
  if (!['view', 'edit', 'admin'].includes(role)) {
    res.status(400).json({ error: 'role must be view, edit, or admin' });
    return;
  }
  const success = collabService.setPermission(projectId, userId, role);
  if (!success) {
    res.status(404).json({ error: 'Session or user not found' });
    return;
  }
  res.json({ projectId, userId, role });
});
