import { v4 as uuidv4 } from "uuid";

export type RightsType = "face" | "voice" | "likeness";
export type RightsScope = "personal" | "commercial";
export type RightsStatus = "active" | "revoked" | "expired" | "transferred";

export interface UsageLogEntry {
  jobId: string;
  usedAt: string;
}

export interface RightsRecord {
  recordId: string;
  subjectId: string;
  ownerId: string;
  type: RightsType;
  scope: RightsScope;
  status: RightsStatus;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  transferredTo: string | null;
  usageLog: UsageLogEntry[];
}

// In-memory store — append-only for audit trail
const store: Map<string, RightsRecord> = new Map();

export function resetStore(): void {
  store.clear();
}

export function createRightsRecord(params: {
  subjectId: string;
  ownerId: string;
  type: RightsType;
  scope: RightsScope;
  expiresAt?: string | null;
}): RightsRecord {
  const recordId = uuidv4();
  const now = new Date().toISOString();

  const record: RightsRecord = {
    recordId,
    subjectId: params.subjectId,
    ownerId: params.ownerId,
    type: params.type,
    scope: params.scope,
    status: "active",
    grantedAt: now,
    expiresAt: params.expiresAt ?? null,
    revokedAt: null,
    revokeReason: null,
    transferredTo: null,
    usageLog: [],
  };

  store.set(recordId, record);
  return record;
}

export function appendUsage(
  recordId: string,
  jobId: string,
): { success: boolean; usageLog: UsageLogEntry[] } {
  const record = store.get(recordId);
  if (!record) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      "Rights record not found",
    );
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  record.usageLog.push({ jobId, usedAt: new Date().toISOString() });
  return { success: true, usageLog: record.usageLog };
}

export function verifyRights(
  subjectId: string,
  usageType: RightsType,
  scope: RightsScope,
): { authorized: boolean; records: RightsRecord[]; expiringWithin30Days: RightsRecord[] } {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subjectRecords: RightsRecord[] = [];
  for (const record of store.values()) {
    if (record.subjectId === subjectId && record.type === usageType && record.scope === scope) {
      subjectRecords.push(record);
    }
  }

  const activeRecords = subjectRecords.filter((r) => {
    if (r.status !== "active") return false;
    if (r.expiresAt && new Date(r.expiresAt) <= now) return false;
    return true;
  });

  const expiringWithin30Days = activeRecords.filter((r) => {
    if (!r.expiresAt) return false;
    const expires = new Date(r.expiresAt);
    return expires > now && expires <= thirtyDays;
  });

  return {
    authorized: activeRecords.length > 0,
    records: activeRecords,
    expiringWithin30Days,
  };
}

export function getAuditTrail(subjectId: string): RightsRecord[] {
  const trail: RightsRecord[] = [];
  for (const record of store.values()) {
    if (record.subjectId === subjectId) {
      trail.push(record);
    }
  }
  return trail.sort(
    (a, b) => new Date(a.grantedAt).getTime() - new Date(b.grantedAt).getTime(),
  );
}

export function revokeRights(
  recordId: string,
  reason: string,
): RightsRecord {
  const record = store.get(recordId);
  if (!record) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      "Rights record not found",
    );
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  record.status = "revoked";
  record.revokedAt = new Date().toISOString();
  record.revokeReason = reason;
  return record;
}

export function transferRights(
  recordId: string,
  newOwnerId: string,
): { oldRecord: RightsRecord; newRecord: RightsRecord } {
  const oldRecord = store.get(recordId);
  if (!oldRecord) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      "Rights record not found",
    );
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  // Mark old record as transferred
  oldRecord.status = "transferred";
  oldRecord.transferredTo = newOwnerId;

  // Create new record for the new owner
  const newRecord = createRightsRecord({
    subjectId: oldRecord.subjectId,
    ownerId: newOwnerId,
    type: oldRecord.type,
    scope: oldRecord.scope,
    expiresAt: oldRecord.expiresAt,
  });

  return { oldRecord, newRecord };
}

export function getRightsReport(ownerId: string): {
  totalRecords: number;
  active: number;
  expired: number;
  revoked: number;
  byType: Record<string, number>;
} {
  const now = new Date();
  let total = 0;
  let active = 0;
  let expired = 0;
  let revoked = 0;
  const byType: Record<string, number> = { face: 0, voice: 0, likeness: 0 };

  for (const record of store.values()) {
    if (record.ownerId !== ownerId) continue;
    total++;
    byType[record.type] = (byType[record.type] ?? 0) + 1;

    if (record.status === "revoked") {
      revoked++;
    } else if (record.expiresAt && new Date(record.expiresAt) <= now) {
      expired++;
    } else if (record.status === "active") {
      active++;
    }
  }

  return { totalRecords: total, active, expired, revoked, byType };
}

export function bulkVerify(
  subjects: Array<{ subjectId: string; usageType: RightsType; scope: RightsScope }>,
): Array<{ subjectId: string; authorized: boolean; records: RightsRecord[]; expiringWithin30Days: RightsRecord[] }> {
  return subjects.map((s) => {
    const result = verifyRights(s.subjectId, s.usageType, s.scope);
    return { subjectId: s.subjectId, ...result };
  });
}
