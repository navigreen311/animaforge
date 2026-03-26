import { v4 as uuidv4 } from "uuid";
import {
  type Platform,
  connectPlatform,
  disconnectPlatform as disconnectPlatformBase,
  publishToPlatform,
  getPublicationHistory,
} from "./socialService.js";
import { applyBrandToOutput } from "./brandKitService.js";

export interface PlatformSpec {
  id: Platform;
  name: string;
  maxDuration: number;
  maxFileSize: string;
  aspectRatios: string[];
  authUrl: string;
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    maxDuration: 43200,
    maxFileSize: "256GB",
    aspectRatios: ["16:9", "9:16"],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    maxDuration: 600,
    maxFileSize: "4GB",
    aspectRatios: ["9:16"],
    authUrl: "https://www.tiktok.com/auth/authorize/",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    maxDuration: 3600,
    maxFileSize: "4GB",
    aspectRatios: ["1:1", "4:5", "9:16"],
    authUrl: "https://api.instagram.com/oauth/authorize",
  },
  twitter: {
    id: "twitter",
    name: "Twitter / X",
    maxDuration: 140,
    maxFileSize: "512MB",
    aspectRatios: ["16:9", "1:1"],
    authUrl: "https://twitter.com/i/oauth2/authorize",
  },
  vimeo: {
    id: "vimeo",
    name: "Vimeo",
    maxDuration: 43200,
    maxFileSize: "256GB",
    aspectRatios: ["16:9", "4:3"],
    authUrl: "https://api.vimeo.com/oauth/authorize",
  },
};

export interface OAuthConnection {
  id: string;
  userId: string;
  platform: Platform;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  connectedAt: string;
}

export interface BrandedPublishResult {
  publishId: string;
  platformUrl: string;
  publishedAt: string;
  brandOperations: string[];
}

export interface ScheduleEntry {
  platform: Platform;
  scheduledAt: string;
}

export interface MultiPlatformSchedule {
  scheduleId: string;
  publications: ScheduleEntry[];
}

export interface CalendarEntry {
  id: string;
  platform: Platform;
  videoUrl: string;
  status: "published" | "scheduled" | "failed";
  scheduledAt?: string;
  publishedAt: string;
  date: string;
}

export interface PerformanceMetrics {
  publishId: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
}

export interface CrossPlatformReport {
  period: string;
  platforms: {
    platform: Platform;
    totalPublications: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    avgEngagementRate: number;
  }[];
  totals: {
    publications: number;
    views: number;
    likes: number;
    shares: number;
    avgEngagementRate: number;
  };
}

const oauthConnections: Map<string, OAuthConnection> = new Map();
const metricsStore: Map<string, PerformanceMetrics> = new Map();

export function resetPublisherStores(): void {
  oauthConnections.clear();
  metricsStore.clear();
}

export function connectOAuth(
  userId: string,
  platform: string,
  _authCode: string,
): OAuthConnection {
  if (!(platform in PLATFORM_SPECS)) {
    const err = new Error("Unsupported platform: " + platform) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_PLATFORM";
    throw err;
  }

  const accessToken = platform + "_access_" + uuidv4().slice(0, 8);
  const refreshToken = platform + "_refresh_" + uuidv4().slice(0, 8);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  const conn: OAuthConnection = {
    id: uuidv4(),
    userId,
    platform: platform as Platform,
    accessToken,
    refreshToken,
    expiresAt,
    connectedAt: new Date().toISOString(),
  };

  oauthConnections.set(conn.id, conn);
  connectPlatform(userId, platform, { accessToken, refreshToken });

  return conn;
}

export async function publishWithBrand(
  userId: string,
  platform: string,
  videoUrl: string,
  brandKitId: string,
): Promise<BrandedPublishResult> {
  if (!(platform in PLATFORM_SPECS)) {
    const err = new Error("Unsupported platform: " + platform) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_PLATFORM";
    throw err;
  }

  const brandResult = await applyBrandToOutput(videoUrl, brandKitId);
  const finalUrl = brandResult.applied ? brandResult.outputUrl : videoUrl;

  const publication = publishToPlatform(userId, platform, finalUrl, {
    brandKitId,
    brandApplied: brandResult.applied,
    brandOperations: brandResult.operations,
  });

  const mockMetrics: PerformanceMetrics = {
    publishId: publication.id,
    views: Math.floor(Math.random() * 10000),
    likes: Math.floor(Math.random() * 1000),
    shares: Math.floor(Math.random() * 200),
    comments: Math.floor(Math.random() * 150),
    engagementRate: parseFloat((Math.random() * 10).toFixed(2)),
  };
  metricsStore.set(publication.id, mockMetrics);

  return {
    publishId: publication.id,
    platformUrl: publication.externalUrl,
    publishedAt: publication.publishedAt,
    brandOperations: brandResult.operations,
  };
}

export async function scheduleMultiPlatform(
  userId: string,
  videoUrl: string,
  platforms: string[],
  scheduleAt: string,
  brandKitId?: string,
): Promise<MultiPlatformSchedule> {
  const entries: ScheduleEntry[] = [];

  for (const platform of platforms) {
    if (!(platform in PLATFORM_SPECS)) {
      const err = new Error("Unsupported platform: " + platform) as Error & {
        statusCode?: number;
        code?: string;
      };
      err.statusCode = 400;
      err.code = "INVALID_PLATFORM";
      throw err;
    }
    entries.push({ platform: platform as Platform, scheduledAt: scheduleAt });
  }

  let finalUrl = videoUrl;
  if (brandKitId) {
    const brandResult = await applyBrandToOutput(videoUrl, brandKitId);
    if (brandResult.applied) {
      finalUrl = brandResult.outputUrl;
    }
  }

  const { schedulePublication } = await import("./socialService.js");
  schedulePublication(
    userId,
    platforms.map((p) => ({
      platform: p,
      videoUrl: finalUrl,
      metadata: { brandKitId: brandKitId ?? null, multiPlatform: true },
      scheduledAt: scheduleAt,
    })),
  );

  return { scheduleId: uuidv4(), publications: entries };
}

export function getPublishingCalendar(
  userId: string,
  month: string,
): CalendarEntry[] {
  const history = getPublicationHistory(userId);

  return history
    .filter((pub) => {
      const dateStr = pub.scheduledAt || pub.publishedAt;
      return dateStr && dateStr.startsWith(month);
    })
    .map((pub) => ({
      id: pub.id,
      platform: pub.platform,
      videoUrl: pub.videoUrl,
      status: pub.status,
      scheduledAt: pub.scheduledAt,
      publishedAt: pub.publishedAt,
      date: (pub.scheduledAt || pub.publishedAt).slice(0, 10),
    }));
}

export function getPerformanceMetrics(
  userId: string,
  publishId: string,
): PerformanceMetrics | null {
  const history = getPublicationHistory(userId);
  const pub = history.find((p) => p.id === publishId);
  if (!pub) return null;

  if (metricsStore.has(publishId)) {
    return metricsStore.get(publishId)!;
  }

  const metrics: PerformanceMetrics = {
    publishId,
    views: Math.floor(Math.random() * 10000),
    likes: Math.floor(Math.random() * 1000),
    shares: Math.floor(Math.random() * 200),
    comments: Math.floor(Math.random() * 150),
    engagementRate: parseFloat((Math.random() * 10).toFixed(2)),
  };
  metricsStore.set(publishId, metrics);
  return metrics;
}

export function getCrossplatformReport(
  userId: string,
  period: string,
): CrossPlatformReport {
  const history = getPublicationHistory(userId);

  const platformMap = new Map<
    Platform,
    { count: number; views: number; likes: number; shares: number; engagementSum: number }
  >();

  for (const pub of history) {
    const dateStr = pub.publishedAt || pub.scheduledAt || "";
    if (!dateStr.startsWith(period)) continue;

    const existing = platformMap.get(pub.platform) ?? {
      count: 0, views: 0, likes: 0, shares: 0, engagementSum: 0,
    };

    const metrics = metricsStore.get(pub.id);
    existing.count += 1;
    existing.views += metrics?.views ?? pub.stats.views;
    existing.likes += metrics?.likes ?? pub.stats.likes;
    existing.shares += metrics?.shares ?? pub.stats.shares;
    existing.engagementSum += metrics?.engagementRate ?? 0;

    platformMap.set(pub.platform, existing);
  }

  const platforms = Array.from(platformMap.entries()).map(([platform, data]) => ({
    platform,
    totalPublications: data.count,
    totalViews: data.views,
    totalLikes: data.likes,
    totalShares: data.shares,
    avgEngagementRate:
      data.count > 0 ? parseFloat((data.engagementSum / data.count).toFixed(2)) : 0,
  }));

  const totals = platforms.reduce(
    (acc, p) => ({
      publications: acc.publications + p.totalPublications,
      views: acc.views + p.totalViews,
      likes: acc.likes + p.totalLikes,
      shares: acc.shares + p.totalShares,
      avgEngagementRate: 0,
    }),
    { publications: 0, views: 0, likes: 0, shares: 0, avgEngagementRate: 0 },
  );

  if (totals.publications > 0) {
    totals.avgEngagementRate = parseFloat(
      (platforms.reduce((sum, p) => sum + p.avgEngagementRate * p.totalPublications, 0) / totals.publications).toFixed(2),
    );
  }

  return { period, platforms, totals };
}

export function revokeAccess(userId: string, platform: string): boolean {
  for (const [key, conn] of oauthConnections) {
    if (conn.userId === userId && conn.platform === platform) {
      oauthConnections.delete(key);
      break;
    }
  }
  return disconnectPlatformBase(userId, platform);
}

export function getSupportedPlatforms(): PlatformSpec[] {
  return Object.values(PLATFORM_SPECS);
}
