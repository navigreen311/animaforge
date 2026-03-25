import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';

export type AlertStatus = 'new' | 'dmca_sent' | 'ignored' | 'monitoring';
export type ActionType = 'dmca' | 'ignore' | 'monitor';
export type ScanFrequency = 'hourly' | 'daily' | 'weekly';

export const PLATFORMS = [
  'youtube',
  'tiktok',
  'instagram',
  'twitter',
  'facebook',
  'vimeo',
  'dailymotion',
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
  confidence: number;
  watermark_detected: boolean;
  query: string;
  detectedAt: string;
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
const alerts = new Map<string, PiracyAlert>();
const scheduledScans = new Map<string, ScheduledScan>();
const contentOwnership = new Map<string, string>(); // contentId -> userId
let totalScans = 0;
let totalMatches = 0;

/* ──────────── Prisma helper — falls back to in-memory on DB error ──────────── */

let usePrisma = true;

async function tryPrisma<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!usePrisma) return null;
  try {
    return await fn();
  } catch {
    usePrisma = false;
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

  tryPrisma(() =>
    prisma.registeredContent.create({
      data: {
        id: content.id,
        outputId: content.outputId,
        watermarkId: content.watermarkId,
        metadata: content.metadata as object,
        registeredAt: content.registeredAt,
        userId: userId ?? null,
      },
    }),
  );

  return content;
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

export function scanPlatform(
  query: string,
  platform: string,
): { matches: ScanMatch[] } {
  totalScans++;

  // Simulate scanning — generate 0-3 mock matches
  const matchCount = Math.floor(Math.random() * 3);
  const matches: ScanMatch[] = [];

  for (let i = 0; i < matchCount; i++) {
    const match: ScanMatch = {
      id: uuidv4(),
      url: `https://${platform}.example.com/content/${uuidv4().slice(0, 8)}`,
      platform,
      confidence: parseFloat((0.6 + Math.random() * 0.4).toFixed(2)),
      watermark_detected: Math.random() > 0.3,
      query,
      detectedAt: new Date().toISOString(),
    };
    matches.push(match);

    // Auto-create alert for each match
    const alert: PiracyAlert = {
      id: uuidv4(),
      matchId: match.id,
      url: match.url,
      platform: match.platform,
      confidence: match.confidence,
      status: 'new',
      createdAt: new Date().toISOString(),
      actionTakenAt: null,
      dmcaNotice: null,
    };
    alerts.set(alert.id, alert);

    tryPrisma(() =>
      prisma.piracyAlert.create({
        data: {
          id: alert.id,
          matchId: alert.matchId,
          url: alert.url,
          platform: alert.platform,
          confidence: alert.confidence,
          status: alert.status,
          createdAt: alert.createdAt,
        },
      }),
    );
  }

  totalMatches += matchCount;
  return { matches };
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

  tryPrisma(() =>
    prisma.scheduledScan.create({
      data: {
        id: scan.id,
        contentId: scan.contentId,
        frequency: scan.frequency,
        nextRunAt: scan.nextRunAt,
        enabled: scan.enabled,
        createdAt: scan.createdAt,
      },
    }),
  );

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

export function detectWatermark(contentUrl: string): {
  url: string;
  watermark_present: boolean;
  watermark_id: string | null;
  confidence: number;
} {
  const detected = Math.random() > 0.3;
  return {
    url: contentUrl,
    watermark_present: detected,
    watermark_id: detected ? `wm-${uuidv4().slice(0, 8)}` : null,
    confidence: detected
      ? parseFloat((0.85 + Math.random() * 0.15).toFixed(2))
      : 0,
  };
}

/* ──────────── DMCA / Legal templates ──────────── */

const DMCA_TEMPLATES: Record<
  string,
  (url: string, confidence: number) => string
> = {
  youtube: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — YouTube',
      '================================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear YouTube Copyright Team,',
      '',
      'I am writing to report content hosted on your platform that infringes upon',
      'copyrighted material registered with AnimaForge Content Protection.',
      '',
      'Pursuant to 17 U.S.C. § 512(c), I request immediate removal of the infringing content.',
      'The original content is registered and watermarked in our system.',
      '',
      'I have a good faith belief that the use of the material is not authorized by the',
      'copyright owner, its agent, or the law.',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  tiktok: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — TikTok',
      '===============================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear TikTok Intellectual Property Team,',
      '',
      'Content at the above URL infringes upon copyrighted material protected by AnimaForge.',
      'Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  instagram: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — Instagram',
      '==================================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear Instagram/Meta Intellectual Property Team,',
      '',
      'Content at the above URL infringes upon copyrighted material protected by AnimaForge.',
      'Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  twitter: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — X (Twitter)',
      '====================================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear X/Twitter Copyright Team,',
      '',
      'Content at the above URL infringes upon copyrighted material protected by AnimaForge.',
      'Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  facebook: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — Facebook',
      '=================================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear Facebook/Meta Intellectual Property Team,',
      '',
      'Content at the above URL infringes upon copyrighted material protected by AnimaForge.',
      'Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  vimeo: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — Vimeo',
      '==============================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear Vimeo Copyright Team,',
      '',
      'Content at the above URL infringes upon copyrighted material protected by AnimaForge.',
      'Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  dailymotion: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE — Dailymotion',
      '====================================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'Dear Dailymotion Copyright Team,',
      '',
      'Content at the above URL infringes upon copyrighted material protected by AnimaForge.',
      'Please remove or disable access to this content under the DMCA (17 U.S.C. § 512).',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),

  default: (url, confidence) =>
    [
      'DMCA TAKEDOWN NOTICE',
      '====================',
      '',
      `Date: ${new Date().toISOString()}`,
      `Infringing URL: ${url}`,
      `Match Confidence: ${(confidence * 100).toFixed(0)}%`,
      '',
      'To Whom It May Concern,',
      '',
      'I am writing to notify you that content hosted at the above URL infringes upon',
      'copyrighted material owned by the content creator registered with AnimaForge.',
      '',
      'This letter is a formal notification under the Digital Millennium Copyright Act (DMCA).',
      'I request that you immediately remove or disable access to the infringing material.',
      '',
      'Sincerely,',
      'AnimaForge Content Protection System',
    ].join('\n'),
};

export function getDMCATemplate(platform: string): string {
  const templateFn = DMCA_TEMPLATES[platform] ?? DMCA_TEMPLATES['default'];
  return templateFn('<URL>', 0);
}

export function generateDMCA(matchId: string): string {
  const alert = Array.from(alerts.values()).find((a) => a.matchId === matchId);
  if (!alert) throw new Error(`No alert found for match ${matchId}`);

  const templateFn =
    DMCA_TEMPLATES[alert.platform] ?? DMCA_TEMPLATES['default'];
  const notice = templateFn(alert.url, alert.confidence);

  alert.status = 'dmca_sent';
  alert.actionTakenAt = new Date().toISOString();
  alert.dmcaNotice = notice;

  tryPrisma(() =>
    prisma.piracyAlert.update({
      where: { id: alert.id },
      data: {
        status: 'dmca_sent',
        actionTakenAt: alert.actionTakenAt,
        dmcaNotice: notice,
      },
    }),
  );

  return notice;
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
    dmca: 'dmca_sent',
    ignore: 'ignored',
    monitor: 'monitoring',
  };

  alert.status = statusMap[action];
  alert.actionTakenAt = new Date().toISOString();

  if (action === 'dmca') {
    alert.dmcaNotice = generateDMCA(alert.matchId);
  }

  return alert;
}

/* ──────────── Dashboard / protection stats ──────────── */

export function getDashboard(): DashboardStats {
  const allAlerts = Array.from(alerts.values());
  const dmcaSent = allAlerts.filter((a) => a.status === 'dmca_sent').length;

  return {
    total_registered: registeredContent.size,
    total_scans: totalScans,
    matches_found: totalMatches,
    dmca_sent: dmcaSent,
    takedown_rate:
      totalMatches > 0
        ? parseFloat((dmcaSent / totalMatches).toFixed(2))
        : 0,
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
  const scansCompleted = userScans.filter(
    (s) => s.lastRunAt !== null,
  ).length;

  // Matches and takedowns from alerts
  const allAlerts = Array.from(alerts.values());
  const matchesFound = allAlerts.length;
  const takedownSuccess = allAlerts.filter(
    (a) => a.status === 'dmca_sent',
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
  alerts.clear();
  scheduledScans.clear();
  contentOwnership.clear();
  totalScans = 0;
  totalMatches = 0;
}
