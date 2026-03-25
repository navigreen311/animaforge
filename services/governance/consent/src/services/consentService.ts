import { v4 as uuidv4 } from "uuid";

export interface ConsentRecord {
  consent_id: string;
  subject_id: string;
  granted_by: string;
  consent_type: string;
  scope: string[];
  status: "active" | "revoked";
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface ValidationResult {
  valid: boolean;
  missing_consents: Array<{
    character_ref: string;
    consent_type: string;
  }>;
}

const consentStore = new Map<string, ConsentRecord>();

export function grantConsent(
  subject_id: string,
  granted_by: string,
  consent_type: string,
  scope: string[],
  expires_at: string | null
): { consent_id: string; status: string } {
  const consent_id = uuidv4();

  const record: ConsentRecord = {
    consent_id,
    subject_id,
    granted_by,
    consent_type,
    scope,
    status: "active",
    expires_at,
    created_at: new Date().toISOString(),
    revoked_at: null,
  };

  consentStore.set(consent_id, record);
  return { consent_id, status: "active" };
}

export function getConsentsBySubject(subject_id: string): ConsentRecord[] {
  const records: ConsentRecord[] = [];
  for (const record of consentStore.values()) {
    if (record.subject_id === subject_id) {
      records.push(record);
    }
  }
  return records;
}

export function revokeConsent(consent_id: string): ConsentRecord | null {
  const record = consentStore.get(consent_id);
  if (!record) return null;

  record.status = "revoked";
  record.revoked_at = new Date().toISOString();
  return record;
}

export function validateConsents(
  character_refs: string[],
  consent_types_needed: string[]
): ValidationResult {
  const missing_consents: Array<{ character_ref: string; consent_type: string }> = [];

  for (const ref of character_refs) {
    const subjectConsents = getConsentsBySubject(ref);
    const activeConsents = subjectConsents.filter(
      (c) => c.status === "active" && (!c.expires_at || new Date(c.expires_at) > new Date())
    );

    for (const consentType of consent_types_needed) {
      const hasConsent = activeConsents.some((c) => c.consent_type === consentType);
      if (!hasConsent) {
        missing_consents.push({ character_ref: ref, consent_type: consentType });
      }
    }
  }

  return {
    valid: missing_consents.length === 0,
    missing_consents,
  };
}

export function clearStore(): void {
  consentStore.clear();
}
