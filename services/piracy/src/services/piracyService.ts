import { v4 as uuidv4 } from "uuid";
import { prisma, isPrismaAvailable } from "../db";
import {
  MATCH_THRESHOLD,
  clearFingerprints,
  getFingerprintCapabilities,
  matchAsset,
  registerFingerprint,
} from "./fingerprintService";
import type { AssetInput, FingerprintMatch } from "./fingerprintService";
import { discoverCandidates, searchCapability } from "./discovery";
import { detectWatermarkInAsset, watermarkCapability } from "./watermarkClient";

export type AlertStatus = "new" | "dmca_sent" | "ignored" | "monitoring";
export type ActionType = "dmca" | "ignore" | "monitor";
export type ScanFrequency = "hourly" | "daily" | "weekly";

export const PLATFORMS = [
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "facebook",
  "vimeo",
  "dailymotion",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export interface RegisteredContent {
  id: string;
  outputId: string;
  watermarkId: string;
  metadata: Record<string, unknown>;
  registeredAt: string;
  userId?: string;
}

export interface ScanMatch {
  id: string;
  url: string;
  platform: string;
  /** Perceptual similarity in [0,1], derived from the Hamming distance. */
  confidence: number;
  /** null when the watermark service could not be consulted. */
  watermark_detected: boolean | null;
  query: string;
  detectedAt: string;
  /** How this match was established — never left implicit. */
  match_method: "perceptual-hash" | "watermark";
  hamming_distance: number | null;
  fingerprint_id: string | null;
  output_id: string | null;
  watermark_id: string | null;
  evidence: Record<string, unknown>;
}

export interface ScanResult {
  matches: ScanMatch[];
  /** Candidate URLs discovery actually returned. */
  candidates_examined: number;
  /** Candidates whose media we managed to fetch and fingerprint. */
  candidates_fingerprinted: number;
  /** True when the scan could not do the job it claims to do. */
  degraded: boolean;
  reasons: string[];
}

export interface PiracyAlert {
  id: string;
  matchId: string;
  url: string;
  platform: string;
  confidence: number;
  status: AlertStatus;
  createdAt: string;
  actionTakenAt: string | null;
  dmcaNotice: string | null;
}

export interface DashboardStats {
  total_registered: number;
  total_scans: number;
  matches_found: number;
  dmca_sent: number;
  takedown_rate: number;
}

export interface ScheduledScan {
  id: string;
  contentId: string;
  frequency: ScanFrequency;
  lastRunAt: string | null;
  nextRunAt: string;
  enabled: boolean;
  createdAt: string;
}

export interface ProtectionStats {
  contentProtected: number;
  scansCompleted: number;
  matchesFound: number;
  takedownSuccess: number;
}

/* ──────────── In-memory stores ──────────── */

const registeredContent = new Map<string, RegisteredContent>();
const registeredFingerprints = new Map<string, string>(); // contentId -> fingerprintId
const alerts = new Map<string, PiracyAlert>();
const scheduledScans = new Map<string, ScheduledScan>();
const contentOwnership = new Map<string, string>(); // contentId -> userId
let totalScans = 0;
let totalMatches = 0;

/* ──────────── Prisma helper — falls back to in-memory on DB error ──────────── */

async function tryPrisma<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!isPrismaAvailable()) return null;
  try {
    return await fn();
  } catch {
    // The in-memory stores keep the service usable without a database. Failing
    // the whole scan because a row could not be written would lose the finding.
    return null;
  }
}

/* ──────────── Content registration ──────────── */

export function registerContent(
  outputId: string,
  watermarkId: string,
  metadata: Record<string, unknown> = {},
  userId?: string,
): RegisteredContent {
  const content: RegisteredContent = {
    id: uuidv4(),
    outputId,
    watermarkId,
    metadata,
    registeredAt: new Date().toISOString(),
    userId,
  };
  registeredContent.set(content.id, content);
  if (userId) contentOwnership.set(content.id, userId);
  return content;
}

/**
 * Register content *and* fingerprint the media, which is what actually makes
 * it findable later. Registering without media leaves nothing to match against.
 */
export async function registerContentWithAsset(
  outputId: string,
  watermarkId: string,
  asset: AssetInput,
  metadata: Record<string, unknown> = {},
  userId?: string,
): Promise<RegisteredContent & { fingerprint_id: string; phash: string }> {
  const content = registerContent(outputId, watermarkId, metadata, userId);
  const fingerprint = await registerFingerprint(outputId, asset, userId);
  registeredFingerprints.set(content.id, fingerprint.id);
  return {
    ...content,
    fingerprint_id: fingerprint.id,
    phash: fingerprint.phash,
  };
}

/* ──────────── Bulk registration ──────────── */

export function registerBatch(
  outputs: Array<{
    outputId: string;
    watermarkId: string;
    metadata?: Record<string, unknown>;
    userId?: string;
  }>,
): RegisteredContent[] {
  return outputs.map((o) =>
    registerContent(o.outputId, o.watermarkId, o.metadata ?? {}, o.userId),
  );
}

/* ──────────── Scanning ──────────── */

const MAX_CANDIDATE_BYTES = Number(
  process.env.PIRACY_MAX_CANDIDATE_BYTES ?? 64 * 1024 * 1024,
);

function remoteFetchAllowed(): boolean {
  return process.env.PIRACY_ALLOW_REMOTE_FETCH === "true";
}

async function fetchCandidateMedia(
  url: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!remoteFetchAllowed()) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_CANDIDATE_BYTES) return null;
  return {
    buffer,
    mimeType:
      response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg",
  };
}

/**
 * Scan a platform for copies of registered content.
 *
 * Two independent stages, each of which can be unavailable on its own:
 *   1. discovery — find candidate URLs (needs a search provider)
 *   2. verification — fetch each candidate, fingerprint it, compare against
 *      everything registered (needs remote fetching enabled)
 * Whatever cannot run is reported in `reasons`; nothing is invented to fill
 * the gap.
 */
export async function scanPlatform(
  query: string,
  platform: string,
): Promise<ScanResult> {
  totalScans++;

  const reasons: string[] = [];
  const discovery = await discoverCandidates(query, platform);
  if (discovery.degraded && discovery.reason) reasons.push(discovery.reason);

  if (!remoteFetchAllowed()) {
    reasons.push(
      "PIRACY_ALLOW_REMOTE_FETCH is not enabled; candidate media cannot be downloaded for fingerprint comparison",
    );
  }

  const matches: ScanMatch[] = [];
  let fingerprinted = 0;

  for (const candidate of discovery.candidates) {
    const target = candidate.mediaUrl ?? candidate.url;
    let media: { buffer: Buffer; mimeType: string } | null = null;
    try {
      media = await fetchCandidateMedia(target);
    } catch (err) {
      reasons.push(
        `could not fetch ${target}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    if (!media) continue;

    const asset: AssetInput = {
      asset_base64: media.buffer.toString("base64"),
      mime_type: media.mimeType,
    };

    let found: FingerprintMatch[] = [];
    try {
      found = (await matchAsset(asset)).matches;
      fingerprinted++;
    } catch (err) {
      reasons.push(
        `could not fingerprint ${target}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    if (found.length === 0) continue;

    const best = found[0];
    const watermark = await detectWatermarkInAsset(asset);

    const match = await recordMatch({
      url: candidate.url,
      platform,
      query,
      best,
      watermark,
    });
    matches.push(match);
  }

  totalMatches += matches.length;

  return {
    matches,
    candidates_examined: discovery.candidates.length,
    candidates_fingerprinted: fingerprinted,
    degraded: reasons.length > 0,
    reasons,
  };
}

/** Persist a confirmed match as a PiracyMatch row plus an operator alert. */
async function recordMatch(input: {
  url: string;
  platform: string;
  query: string;
  best: FingerprintMatch;
  watermark: {
    present: boolean | null;
    watermarkId: string | null;
    method: string;
  };
}): Promise<ScanMatch> {
  const { url, platform, query, best, watermark } = input;
  const evidence: Record<string, unknown> = {
    algorithm: best.algorithm,
    distances: best.distances,
    threshold: MATCH_THRESHOLD,
    confidence_band: best.confidence,
    watermark_method: watermark.method,
    query,
  };

  const match: ScanMatch = {
    id: uuidv4(),
    url,
    platform,
    confidence: best.similarity,
    watermark_detected: watermark.present,
    query,
    detectedAt: new Date().toISOString(),
    match_method: "perceptual-hash",
    hamming_distance: Math.round(best.distance),
    fingerprint_id: best.fingerprint.id,
    output_id: best.fingerprint.outputId,
    watermark_id: watermark.watermarkId,
    evidence,
  };

  const persisted = await tryPrisma(() =>
    prisma!.piracyMatch.create({
      data: {
        outputId: best.fingerprint.outputId,
        userId: best.fingerprint.userId ?? "unknown",
        platform,
        matchUrl: url,
        matchStrength: best.similarity,
        watermarkFound: watermark.present === true,
        status: "pending",
        fingerprintId: best.fingerprint.id,
        matchMethod: "perceptual-hash",
        hammingDistance: Math.round(best.distance),
        watermarkId: watermark.watermarkId,
        evidence: evidence as object,
      },
    }),
  );
  if (persisted) match.id = persisted.id;

  const alert: PiracyAlert = {
    id: uuidv4(),
    matchId: match.id,
    url: match.url,
    platform: match.platform,
    confidence: match.confidence,
    status: "new",
    createdAt: new Date().toISOString(),
    actionTakenAt: null,
    dmcaNotice: null,
  };
  alerts.set(alert.id, alert);

  return match;
}

/**
 * Compare one supplied asset against everything registered.
 *
 * This is the honest core of X4: no discovery, no network, just perceptual
 * matching on bytes the caller already has.
 */
export async function matchSuppliedAsset(
  asset: AssetInput,
  threshold: number = MATCH_THRESHOLD,
): Promise<{
  phash: string;
  media_type: string;
  algorithm: string;
  threshold: number;
  matches: FingerprintMatch[];
}> {
  const { probe, matches } = await matchAsset(asset, threshold);
  return {
    phash: probe.phash,
    media_type: probe.mediaType,
    algorithm: probe.algorithm,
    threshold,
    matches,
  };
}

/* ──────────── Scheduled / automated scanning ──────────── */

export function scheduleScan(
  contentId: string,
  frequency: ScanFrequency,
): ScheduledScan {
  const now = new Date();
  const intervalMs: Record<ScanFrequency, number> = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
  };

  const nextRun = new Date(now.getTime() + intervalMs[frequency]);

  const scan: ScheduledScan = {
    id: uuidv4(),
    contentId,
    frequency,
    lastRunAt: null,
    nextRunAt: nextRun.toISOString(),
    enabled: true,
    createdAt: now.toISOString(),
  };

  scheduledScans.set(scan.id, scan);
  return scan;
}

export function getScheduledScans(contentId?: string): ScheduledScan[] {
  const all = Array.from(scheduledScans.values());
  return contentId ? all.filter((s) => s.contentId === contentId) : all;
}

/* ──────────── Confidence scoring ──────────── */

export function calculateMatchConfidence(
  source: {
    fingerprint?: string;
    duration?: number;
    resolution?: string;
    title?: string;
  },
  detected: {
    fingerprint?: string;
    duration?: number;
    resolution?: string;
    title?: string;
  },
): number {
  let score = 0;
  let weights = 0;

  // Fingerprint match (highest weight)
  if (source.fingerprint && detected.fingerprint) {
    const fpWeight = 0.4;
    weights += fpWeight;
    score += source.fingerprint === detected.fingerprint ? fpWeight : 0;
  }

  // Duration similarity
  if (source.duration && detected.duration) {
    const durWeight = 0.25;
    weights += durWeight;
    const ratio =
      Math.min(source.duration, detected.duration) /
      Math.max(source.duration, detected.duration);
    score += ratio * durWeight;
  }

  // Resolution match
  if (source.resolution && detected.resolution) {
    const resWeight = 0.15;
    weights += resWeight;
    score += source.resolution === detected.resolution ? resWeight : 0;
  }

  // Title similarity (simple word overlap)
  if (source.title && detected.title) {
    const titleWeight = 0.2;
    weights += titleWeight;
    const srcWords = new Set(source.title.toLowerCase().split(/\s+/));
    const detWords = detected.title.toLowerCase().split(/\s+/);
    const overlap = detWords.filter((w) => srcWords.has(w)).length;
    const similarity =
      detWords.length > 0
        ? overlap / Math.max(srcWords.size, detWords.length)
        : 0;
    score += similarity * titleWeight;
  }

  if (weights === 0) return 0;
  return parseFloat((score / weights).toFixed(4));
}

/* ──────────── Watermark detection (unchanged) ──────────── */

/**
 * Watermark probe.
 *
 * A URL is not evidence — the watermark lives in the pixels. This delegates to
 * the watermark service when one is configured and otherwise reports
 * `watermark_present: null`, meaning "not checked", which is deliberately not
 * the same value as `false`.
 */
export async function detectWatermark(
  contentUrl: string,
  asset?: AssetInput,
): Promise<{
  url: string;
  watermark_present: boolean | null;
  watermark_id: string | null;
  confidence: number;
  method: string;
  reason: string | null;
}> {
  const probe = await detectWatermarkInAsset(
    asset ?? { asset_base64: undefined, asset_path: undefined },
  );
  return {
    url: contentUrl,
    watermark_present: probe.present,
    watermark_id: probe.watermarkId,
    confidence: probe.confidence,
    method: probe.method,
    reason: probe.reason,
  };
}

/* ──────────── DMCA / Legal templates ──────────── */

const DMCA_TEMPLATES: Record<
  string,
  (url: string, confidence: number) => string
> = {
  youtube: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — YouTube",
      "================================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear YouTube Copyright Team,",
      "",
      "I am writing to report content hosted on your platform that infringes upon",
      "copyrighted material registered with AnimaForge Content Protection.",
      "",
      "Pursuant to 17 U.S.C. § 512(c), I request immediate removal of the infringing content.",
      "The original content is registered and watermarked in our system.",
      "",
      "I have a good faith belief that the use of the material is not authorized by the",
      "copyright owner, its agent, or the law.",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  tiktok: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — TikTok",
      "===============================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear TikTok Intellectual Property Team,",
      "",
      "Content at the above URL infringes upon copyrighted material protected by AnimaForge.",
      "Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  instagram: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — Instagram",
      "==================================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear Instagram/Meta Intellectual Property Team,",
      "",
      "Content at the above URL infringes upon copyrighted material protected by AnimaForge.",
      "Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  twitter: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — X (Twitter)",
      "====================================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear X/Twitter Copyright Team,",
      "",
      "Content at the above URL infringes upon copyrighted material protected by AnimaForge.",
      "Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  facebook: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — Facebook",
      "=================================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear Facebook/Meta Intellectual Property Team,",
      "",
      "Content at the above URL infringes upon copyrighted material protected by AnimaForge.",
      "Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  vimeo: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — Vimeo",
      "==============================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear Vimeo Copyright Team,",
      "",
      "Content at the above URL infringes upon copyrighted material protected by AnimaForge.",
      "Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  dailymotion: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE — Dailymotion",
      "====================================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "Dear Dailymotion Copyright Team,",
      "",
      "Content at the above URL infringes upon copyrighted material protected by AnimaForge.",
      "Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),

  default: (url, confidence) =>
    [
      "DMCA TAKEDOWN NOTICE",
      "====================",
      "",
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      "",
      "To Whom It May Concern,",
      "",
      "I am writing to notify you that content hosted at the above URL infringes upon",
      "copyrighted material owned by the content creator registered with AnimaForge.",
      "",
      "This letter is a formal notification under the Digital Millennium Copyright Act (DMCA).",
      "I request that you immediately remove or disable access to the infringing material.",
      "",
      "Sincerely,",
      "AnimaForge Content Protection System",
    ].join("\n"),
};

export function getDMCATemplate(platform: string): string {
  const templateFn = DMCA_TEMPLATES[platform] ?? DMCA_TEMPLATES["default"];
  return templateFn("<URL>", 0);
}

export function generateDMCA(matchId: string): string {
  const alert = Array.from(alerts.values()).find((a) => a.matchId === matchId);
  if (!alert) throw new Error(`No alert found for match ${matchId}`);

  const templateFn =
    DMCA_TEMPLATES[alert.platform] ?? DMCA_TEMPLATES["default"];
  const notice = templateFn(alert.url, alert.confidence);

  alert.status = "dmca_sent";
  alert.actionTakenAt = new Date().toISOString();
  alert.dmcaNotice = notice;

  // Fire-and-forget: the notice text is already returned to the caller, and a
  // database outage must not stop a takedown from being generated.
  void persistDMCANotice(alert, notice);

  return notice;
}

async function persistDMCANotice(
  alert: PiracyAlert,
  notice: string,
): Promise<void> {
  await tryPrisma(async () => {
    await prisma!.piracyMatch.update({
      where: { id: alert.matchId },
      data: { status: "dmca_sent", reviewedAt: new Date() },
    });
    return prisma!.dMCANotice.create({
      data: {
        matchId: alert.matchId,
        userId: (alert as { userId?: string }).userId ?? "unknown",
        platform: alert.platform,
        status: "draft",
        body: notice,
        metadata: { url: alert.url, confidence: alert.confidence },
      },
    });
  });
}

/* ──────────── Alerts ──────────── */

export function getAlerts(): PiracyAlert[] {
  return Array.from(alerts.values());
}

export function getAlert(id: string): PiracyAlert | undefined {
  return alerts.get(id);
}

export function updateAlertAction(id: string, action: ActionType): PiracyAlert {
  const alert = alerts.get(id);
  if (!alert) throw new Error(`Alert ${id} not found`);

  const statusMap: Record<ActionType, AlertStatus> = {
    dmca: "dmca_sent",
    ignore: "ignored",
    monitor: "monitoring",
  };

  alert.status = statusMap[action];
  alert.actionTakenAt = new Date().toISOString();

  if (action === "dmca") {
    alert.dmcaNotice = generateDMCA(alert.matchId);
  }

  return alert;
}

/* ──────────── Dashboard / protection stats ──────────── */

export function getDashboard(): DashboardStats {
  const allAlerts = Array.from(alerts.values());
  const dmcaSent = allAlerts.filter((a) => a.status === "dmca_sent").length;

  return {
    total_registered: registeredContent.size,
    total_scans: totalScans,
    matches_found: totalMatches,
    dmca_sent: dmcaSent,
    takedown_rate:
      totalMatches > 0 ? parseFloat((dmcaSent / totalMatches).toFixed(2)) : 0,
  };
}

export function getProtectionStats(userId: string): ProtectionStats {
  // Content owned by this user
  const userContentIds = new Set<string>();
  for (const [contentId, owner] of contentOwnership.entries()) {
    if (owner === userId) userContentIds.add(contentId);
  }

  // Also count by userId field on registered content
  for (const content of registeredContent.values()) {
    if (content.userId === userId) userContentIds.add(content.id);
  }

  const contentProtected = userContentIds.size;

  // Count scans for user's content
  const userScans = Array.from(scheduledScans.values()).filter((s) =>
    userContentIds.has(s.contentId),
  );
  const scansCompleted = userScans.filter((s) => s.lastRunAt !== null).length;

  // Matches and takedowns from alerts
  const allAlerts = Array.from(alerts.values());
  const matchesFound = allAlerts.length;
  const takedownSuccess = allAlerts.filter(
    (a) => a.status === "dmca_sent",
  ).length;

  return {
    contentProtected,
    scansCompleted,
    matchesFound,
    takedownSuccess,
  };
}

/* ──────────── Cleanup ──────────── */

export function clearStore(): void {
  registeredContent.clear();
  registeredFingerprints.clear();
  alerts.clear();
  scheduledScans.clear();
  contentOwnership.clear();
  clearFingerprints();
  totalScans = 0;
  totalMatches = 0;
}

/* ──────────── Capabilities ──────────── */

export interface PiracyCapabilities {
  service: string;
  fingerprinting: Awaited<ReturnType<typeof getFingerprintCapabilities>>;
  discovery: ReturnType<typeof searchCapability>;
  watermark_service: ReturnType<typeof watermarkCapability>;
  remote_fetch: { enabled: boolean };
  database: { connected: boolean };
  degraded: boolean;
  degraded_reasons: string[];
}

export async function getCapabilities(): Promise<PiracyCapabilities> {
  const fingerprinting = await getFingerprintCapabilities();
  const discovery = searchCapability();
  const watermark = watermarkCapability();
  const reasons: string[] = [];

  if (!discovery.configured && discovery.detail) reasons.push(discovery.detail);
  if (!watermark.configured && watermark.detail) reasons.push(watermark.detail);
  if (!remoteFetchAllowed()) {
    reasons.push(
      "PIRACY_ALLOW_REMOTE_FETCH is not enabled; scans cannot download candidate media",
    );
  }
  if (!fingerprinting.video_fingerprinting.available) {
    reasons.push("ffmpeg not found — video fingerprinting is unavailable");
  }
  if (!isPrismaAvailable()) {
    reasons.push("no database connection — matches are in-memory only");
  }

  return {
    service: "piracy-monitoring",
    fingerprinting,
    discovery,
    watermark_service: watermark,
    remote_fetch: { enabled: remoteFetchAllowed() },
    database: { connected: isPrismaAvailable() },
    degraded: reasons.length > 0,
    degraded_reasons: reasons,
  };
}
