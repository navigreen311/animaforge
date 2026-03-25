import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  grantConsent,
  getConsentsBySubject,
  revokeConsent,
  validateConsents,
} from "../services/consentService";

const router = Router();

const GrantConsentSchema = z.object({
  subject_id: z.string().min(1),
  granted_by: z.string().min(1),
  consent_type: z.string().min(1),
  scope: z.array(z.string()),
  expires_at: z.string().nullable().optional(),
});

const ValidateConsentSchema = z.object({
  character_refs: z.array(z.string().min(1)).min(1),
  consent_types_needed: z.array(z.string().min(1)).min(1),
});

router.post("/api/v1/rights/consent", (req: Request, res: Response) => {
  const parsed = GrantConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { subject_id, granted_by, consent_type, scope, expires_at } = parsed.data;
  const result = grantConsent(subject_id, granted_by, consent_type, scope, expires_at ?? null);
  res.status(201).json(result);
});

router.get("/api/v1/rights/consent/:subjectId", (req: Request, res: Response) => {
  const subjectId = req.params.subjectId as string;
  const records = getConsentsBySubject(subjectId);
  res.status(200).json({ subject_id: subjectId, consents: records });
});

router.delete("/api/v1/rights/consent/:id", (req: Request, res: Response) => {
  const id = req.params.id as string;
  const record = revokeConsent(id);

  if (!record) {
    res.status(404).json({ error: "Consent record not found" });
    return;
  }

  res.status(200).json({ consent_id: record.consent_id, status: record.status });
});

router.post("/governance/consent/validate", (req: Request, res: Response) => {
  const parsed = ValidateConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const { character_refs, consent_types_needed } = parsed.data;
  const result = validateConsents(character_refs, consent_types_needed);
  res.status(200).json(result);
});

export default router;
