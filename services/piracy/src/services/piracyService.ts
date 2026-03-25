import { v4 as uuidv4 } from 'uuid';

export type AlertStatus = 'new' | 'dmca_sent' | 'ignored' | 'monitoring';
export type ActionType = 'dmca' | 'ignore' | 'monitor';

export interface RegisteredContent {
  id: string;
  outputId: string;
  watermarkId: string;
  metadata: Record<string, unknown>;
  registeredAt: string;
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

const registeredContent = new Map<string, RegisteredContent>();
const alerts = new Map<string, PiracyAlert>();
let totalScans = 0;
let totalMatches = 0;

export function registerContent(
  outputId: string,
  watermarkId: string,
  metadata: Record<string, unknown> = {}
): RegisteredContent {
  const content: RegisteredContent = {
    id: uuidv4(),
    outputId,
    watermarkId,
    metadata,
    registeredAt: new Date().toISOString(),
  };
  registeredContent.set(content.id, content);
  return content;
}

export function scanPlatform(
  query: string,
  platform: string
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
  }

  totalMatches += matchCount;
  return { matches };
}

export function detectWatermark(contentUrl: string): {
  url: string;
  watermark_present: boolean;
  watermark_id: string | null;
  confidence: number;
} {
  // Simulate watermark detection
  const detected = Math.random() > 0.3;
  return {
    url: contentUrl,
    watermark_present: detected,
    watermark_id: detected ? `wm-${uuidv4().slice(0, 8)}` : null,
    confidence: detected ? parseFloat((0.85 + Math.random() * 0.15).toFixed(2)) : 0,
  };
}

export function generateDMCA(matchId: string): string {
  const alert = Array.from(alerts.values()).find((a) => a.matchId === matchId);
  if (!alert) throw new Error(`No alert found for match ${matchId}`);

  const notice = [
    'DMCA TAKEDOWN NOTICE',
    '====================',
    '',
    `Date: ${new Date().toISOString()}`,
    `Platform: ${alert.platform}`,
    `Infringing URL: ${alert.url}`,
    `Confidence: ${(alert.confidence * 100).toFixed(0)}%`,
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
  ].join('\n');

  alert.status = 'dmca_sent';
  alert.actionTakenAt = new Date().toISOString();
  alert.dmcaNotice = notice;

  return notice;
}

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

export function getDashboard(): DashboardStats {
  const allAlerts = Array.from(alerts.values());
  const dmcaSent = allAlerts.filter((a) => a.status === 'dmca_sent').length;

  return {
    total_registered: registeredContent.size,
    total_scans: totalScans,
    matches_found: totalMatches,
    dmca_sent: dmcaSent,
    takedown_rate: totalMatches > 0 ? parseFloat((dmcaSent / totalMatches).toFixed(2)) : 0,
  };
}

export function clearStore(): void {
  registeredContent.clear();
  alerts.clear();
  totalScans = 0;
  totalMatches = 0;
}
