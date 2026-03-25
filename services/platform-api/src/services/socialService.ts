import { v4 as uuidv4 } from "uuid";

export const SUPPORTED_PLATFORMS = [
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "vimeo",
] as const;

export type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export interface PlatformConnection {
  id: string;
  userId: string;
  platform: Platform;
  credentials: Record<string, string>;
  status: "connected" | "expired" | "revoked";
  connectedAt: string;
}

export interface Publication {
  id: string;
  userId: string;
  platform: Platform;
  videoUrl: string;
  metadata: Record<string, unknown>;
  externalId: string;
  externalUrl: string;
  status: "published" | "scheduled" | "failed";
  scheduledAt?: string;
  publishedAt: string;
  stats: { views: number; likes: number; shares: number };
}

// In-memory stores
const connections: Map<string, PlatformConnection> = new Map();
const publications: Map<string, Publication> = new Map();

export function resetStores(): void {
  connections.clear();
  publications.clear();
}

function isPlatformSupported(platform: string): platform is Platform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(platform);
}

export function connectPlatform(
  userId: string,
  platform: string,
  credentials: Record<string, string>,
): PlatformConnection {
  if (!isPlatformSupported(platform)) {
    const err = new Error(`Unsupported platform: ${platform}`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_PLATFORM";
    throw err;
  }

  const conn: PlatformConnection = {
    id: uuidv4(),
    userId,
    platform,
    credentials,
    status: "connected",
    connectedAt: new Date().toISOString(),
  };
  connections.set(conn.id, conn);
  return conn;
}

export function disconnectPlatform(userId: string, platform: string): boolean {
  for (const [key, conn] of connections) {
    if (conn.userId === userId && conn.platform === platform) {
      connections.delete(key);
      return true;
    }
  }
  return false;
}

export function getConnections(userId: string): PlatformConnection[] {
  return Array.from(connections.values()).filter((c) => c.userId === userId);
}

function simulatePublish(
  userId: string,
  platform: Platform,
  videoUrl: string,
  metadata: Record<string, unknown>,
): Publication {
  const externalId = `${platform}_${uuidv4().slice(0, 8)}`;
  const domainMap: Record<Platform, string> = {
    youtube: "https://youtube.com/watch?v=",
    tiktok: "https://tiktok.com/@user/video/",
    instagram: "https://instagram.com/p/",
    twitter: "https://twitter.com/i/status/",
    vimeo: "https://vimeo.com/",
  };

  const pub: Publication = {
    id: uuidv4(),
    userId,
    platform,
    videoUrl,
    metadata,
    externalId,
    externalUrl: `${domainMap[platform]}${externalId}`,
    status: "published",
    publishedAt: new Date().toISOString(),
    stats: { views: 0, likes: 0, shares: 0 },
  };
  publications.set(pub.id, pub);
  return pub;
}

export function publishToYouTube(
  userId: string,
  videoUrl: string,
  metadata: Record<string, unknown>,
): Publication {
  return simulatePublish(userId, "youtube", videoUrl, metadata);
}

export function publishToTikTok(
  userId: string,
  videoUrl: string,
  metadata: Record<string, unknown>,
): Publication {
  return simulatePublish(userId, "tiktok", videoUrl, metadata);
}

export function publishToInstagram(
  userId: string,
  videoUrl: string,
  metadata: Record<string, unknown>,
): Publication {
  return simulatePublish(userId, "instagram", videoUrl, metadata);
}

export function publishToPlatform(
  userId: string,
  platform: string,
  videoUrl: string,
  metadata: Record<string, unknown>,
): Publication {
  if (!isPlatformSupported(platform)) {
    const err = new Error(`Unsupported platform: ${platform}`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "INVALID_PLATFORM";
    throw err;
  }
  return simulatePublish(userId, platform, videoUrl, metadata);
}

export function schedulePublication(
  userId: string,
  items: Array<{ platform: string; videoUrl: string; metadata: Record<string, unknown>; scheduledAt: string }>,
): Publication[] {
  return items.map((item) => {
    if (!isPlatformSupported(item.platform)) {
      const err = new Error(`Unsupported platform: ${item.platform}`) as Error & {
        statusCode?: number;
        code?: string;
      };
      err.statusCode = 400;
      err.code = "INVALID_PLATFORM";
      throw err;
    }

    const pub: Publication = {
      id: uuidv4(),
      userId,
      platform: item.platform,
      videoUrl: item.videoUrl,
      metadata: item.metadata,
      externalId: "",
      externalUrl: "",
      status: "scheduled",
      scheduledAt: item.scheduledAt,
      publishedAt: "",
      stats: { views: 0, likes: 0, shares: 0 },
    };
    publications.set(pub.id, pub);
    return pub;
  });
}

export function getPublicationHistory(userId: string): Publication[] {
  return Array.from(publications.values()).filter((p) => p.userId === userId);
}
