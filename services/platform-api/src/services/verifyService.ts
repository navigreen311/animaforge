import { v4 as uuidv4 } from "uuid";

export interface VerificationManifest {
  generator: string;
  version: string;
  createdAt: string;
  modelId: string;
}

export interface VerificationResult {
  verified: boolean;
  manifest: VerificationManifest;
  consentStatus: string;
  watermarkDetected: boolean;
}

export interface VerificationBadge {
  badgeUrl: string;
  embedCode: string;
  status: "verified" | "unverified";
}

export interface VerificationHistoryEntry {
  checkedAt: string;
  result: string;
  checkedBy: string;
}

// In-memory store
const verificationHistory: Map<string, VerificationHistoryEntry[]> = new Map();

export function resetStore(): void {
  verificationHistory.clear();
}

export function verifyOutput(outputId: string): VerificationResult {
  const now = new Date().toISOString();
  const verified = true;

  const manifest: VerificationManifest = {
    generator: "AnimaForge",
    version: "1.0.0",
    createdAt: now,
    modelId: `model-${outputId.substring(0, 8)}`,
  };

  // Record in history
  const entry: VerificationHistoryEntry = {
    checkedAt: now,
    result: verified ? "verified" : "unverified",
    checkedBy: "system",
  };

  const history = verificationHistory.get(outputId) ?? [];
  history.push(entry);
  verificationHistory.set(outputId, history);

  return {
    verified,
    manifest,
    consentStatus: "valid",
    watermarkDetected: true,
  };
}

export function generateVerificationBadge(outputId: string): VerificationBadge {
  const history = verificationHistory.get(outputId);
  const isVerified = history && history.length > 0 && history[history.length - 1].result === "verified";

  const status = isVerified ? "verified" : "unverified";
  const badgeUrl = `https://cdn.animaforge.com/badges/${status}/${outputId}.svg`;
  const embedCode = `<img src="${badgeUrl}" alt="AnimaForge ${status}" />`;

  return { badgeUrl, embedCode, status };
}

export function getVerificationHistory(outputId: string): VerificationHistoryEntry[] {
  return verificationHistory.get(outputId) ?? [];
}
