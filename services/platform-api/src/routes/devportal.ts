import { Router } from "express";
import type { Request, Response } from "express";
import { devportalService } from "../services/devportalService.js";

const router = Router();

router.get("/developer/usage", (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) ?? "anonymous";
    const period = (req.query.period as string) ?? "30d";
    const usage = devportalService.getApiUsage(userId, period);
    res.status(200).json({ success: true, data: usage });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.post("/developer/webhooks", (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) ?? "anonymous";
    const { url, events } = req.body;
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "url and events[] are required" } });
      return;
    }
    const webhook = devportalService.createWebhook(userId, url, events);
    res.status(201).json({ success: true, data: webhook });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.get("/developer/webhooks", (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) ?? "anonymous";
    const webhooks = devportalService.listWebhooks(userId);
    res.status(200).json({ success: true, data: webhooks });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.delete("/developer/webhooks/:id", (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) ?? "anonymous";
    const deleted = devportalService.deleteWebhook(userId, req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Webhook not found" } });
      return;
    }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.post("/developer/webhooks/:id/test", (req: Request, res: Response) => {
  try {
    const log = devportalService.testWebhook(req.params.id);
    res.status(200).json({ success: true, data: log });
  } catch (err: unknown) {
    const e = err as Error;
    const status = e.message.includes("not found") ? 404 : 500;
    const code = status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";
    res.status(status).json({ success: false, error: { code, message: e.message } });
  }
});

router.get("/developer/webhooks/:id/logs", (req: Request, res: Response) => {
  try {
    const logs = devportalService.getWebhookLogs(req.params.id);
    res.status(200).json({ success: true, data: logs });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.post("/developer/sandbox", (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) ?? "anonymous";
    const creds = devportalService.getSandboxCredentials(userId);
    res.status(200).json({ success: true, data: creds });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.get("/developer/changelog", (_req: Request, res: Response) => {
  try {
    const changelog = devportalService.getApiChangelog();
    res.status(200).json({ success: true, data: changelog });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

router.get("/developer/rate-limit", (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) ?? "anonymous";
    const status = devportalService.getRateLimitStatus(userId);
    res.status(200).json({ success: true, data: status });
  } catch (err: unknown) {
    const e = err as Error;
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: e.message } });
  }
});

export default router;
