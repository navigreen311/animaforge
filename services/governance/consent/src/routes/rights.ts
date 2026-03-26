import { Router, Request, Response } from "express";
import * as rightsLedger from "../services/rightsLedger";

const router = Router();

// POST /api/v1/rights/records
router.post("/api/v1/rights/records", (req: Request, res: Response): void => {
  const { subjectId, ownerId, type, scope, expiresAt } = req.body;
  if (!subjectId || !ownerId || !type || !scope) {
    res.status(400).json({ error: "subjectId, ownerId, type, and scope are required" });
    return;
  }
  try {
    const record = rightsLedger.createRightsRecord({ subjectId, ownerId, type, scope, expiresAt });
    res.status(201).json({ success: true, data: record });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

// POST /api/v1/rights/records/:id/usage
router.post("/api/v1/rights/records/:id/usage", (req: Request, res: Response): void => {
  const { jobId } = req.body;
  if (!jobId) {
    res.status(400).json({ error: "jobId is required" });
    return;
  }
  try {
    const result = rightsLedger.appendUsage(req.params.id, jobId);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

// POST /api/v1/rights/verify
router.post("/api/v1/rights/verify", (req: Request, res: Response): void => {
  const { subjectId, usageType, scope } = req.body;
  if (!subjectId || !usageType || !scope) {
    res.status(400).json({ error: "subjectId, usageType, and scope are required" });
    return;
  }
  try {
    const result = rightsLedger.verifyRights(subjectId, usageType, scope);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

// GET /api/v1/rights/audit/:subjectId
router.get("/api/v1/rights/audit/:subjectId", (req: Request, res: Response): void => {
  const trail = rightsLedger.getAuditTrail(req.params.subjectId);
  res.status(200).json({ success: true, data: trail });
});

// PUT /api/v1/rights/records/:id/revoke
router.put("/api/v1/rights/records/:id/revoke", (req: Request, res: Response): void => {
  const { reason } = req.body;
  if (!reason) {
    res.status(400).json({ error: "reason is required" });
    return;
  }
  try {
    const record = rightsLedger.revokeRights(req.params.id, reason);
    res.status(200).json({ success: true, data: record });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

// PUT /api/v1/rights/records/:id/transfer
router.put("/api/v1/rights/records/:id/transfer", (req: Request, res: Response): void => {
  const { newOwnerId } = req.body;
  if (!newOwnerId) {
    res.status(400).json({ error: "newOwnerId is required" });
    return;
  }
  try {
    const result = rightsLedger.transferRights(req.params.id, newOwnerId);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

// GET /api/v1/rights/report/:ownerId
router.get("/api/v1/rights/report/:ownerId", (req: Request, res: Response): void => {
  const report = rightsLedger.getRightsReport(req.params.ownerId);
  res.status(200).json({ success: true, data: report });
});

// POST /api/v1/rights/verify-bulk
router.post("/api/v1/rights/verify-bulk", (req: Request, res: Response): void => {
  const { subjects } = req.body;
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    res.status(400).json({ error: "subjects array is required" });
    return;
  }
  try {
    const results = rightsLedger.bulkVerify(subjects);
    res.status(200).json({ success: true, data: results });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; code?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

export default router;
