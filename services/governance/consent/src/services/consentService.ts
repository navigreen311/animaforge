import { v4 as uuidv4 } from "uuid";
import { prisma, isPrismaAvailable } from "../db";

export interface ConsentRecord { consent_id: string; subject_id: string; granted_by: string; consent_type: string; scope: string[]; status: "active" | "revoked"; expires_at: string | null; created_at: string; revoked_at: string | null; }
export interface ValidationResult { valid: boolean; missing_consents: Array<{ character_ref: string; consent_type: string }>; }

const consentStore = new Map<string, ConsentRecord>();

function isExpired(consent: { expires_at: string | null | Date }): boolean {
  if (!consent.expires_at) return false;
  const expiresAt = consent.expires_at instanceof Date ? consent.expires_at : new Date(consent.expires_at);
  return expiresAt <= new Date();
}

function dbRowToRecord(row: { id: string; subjectId: string; grantedBy: string; consentType: string; scope: string; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }): ConsentRecord {
  return { consent_id: row.id, subject_id: row.subjectId, granted_by: row.grantedBy, consent_type: row.consentType, scope: row.scope.split(",").filter(Boolean), status: row.revokedAt ? "revoked" : "active", expires_at: row.expiresAt ? row.expiresAt.toISOString() : null, created_at: row.createdAt.toISOString(), revoked_at: row.revokedAt ? row.revokedAt.toISOString() : null };
}

export async function grantConsent(subject_id: string, granted_by: string, consent_type: string, scope: string[], expires_at: string | null): Promise<{ consent_id: string; status: string }> {
  try { if (await isPrismaAvailable()) { const row = await prisma.consent.create({ data: { subjectId: subject_id, grantedBy: granted_by, consentType: consent_type, scope: scope.join(","), expiresAt: expires_at ? new Date(expires_at) : null } }); return { consent_id: row.id, status: "active" }; } } catch { /* fall through */ }
  const consent_id = uuidv4();
  consentStore.set(consent_id, { consent_id, subject_id, granted_by, consent_type, scope, status: "active", expires_at, created_at: new Date().toISOString(), revoked_at: null });
  return { consent_id, status: "active" };
}

export async function getConsentsBySubject(subject_id: string): Promise<ConsentRecord[]> {
  try { if (await isPrismaAvailable()) { const rows = await prisma.consent.findMany({ where: { subjectId: subject_id, revokedAt: null }, orderBy: { createdAt: "asc" } }); return rows.map(dbRowToRecord); } } catch { /* fall through */ }
  const records: ConsentRecord[] = [];
  for (const record of consentStore.values()) { if (record.subject_id === subject_id) records.push(record); }
  return records;
}

export async function revokeConsent(consent_id: string): Promise<ConsentRecord | null> {
  try { if (await isPrismaAvailable()) { const row = await prisma.consent.update({ where: { id: consent_id }, data: { revokedAt: new Date() } }); return dbRowToRecord(row); } } catch { /* fall through */ }
  const record = consentStore.get(consent_id);
  if (!record) return null;
  record.status = "revoked"; record.revoked_at = new Date().toISOString();
  return record;
}

export async function validateConsents(character_refs: string[], consent_types_needed: string[]): Promise<ValidationResult> {
  const missing_consents: Array<{ character_ref: string; consent_type: string }> = [];
  for (const ref of character_refs) {
    const subjectConsents = await getConsentsBySubject(ref);
    const activeConsents = subjectConsents.filter((c) => c.status === "active" && !isExpired(c));
    for (const consentType of consent_types_needed) { if (!activeConsents.some((c) => c.consent_type === consentType)) { missing_consents.push({ character_ref: ref, consent_type: consentType }); } }
  }
  return { valid: missing_consents.length === 0, missing_consents };
}

export function clearStore(): void { consentStore.clear(); }
