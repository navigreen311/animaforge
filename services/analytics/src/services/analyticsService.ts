import { v4 as uuidv4 } from "uuid";

export interface AnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  projectId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface ProjectAnalytics {
  projectId: string;
  generationCount: number;
  averageQuality: number;
  creditUsage: number;
  eventCount: number;
}

export interface UserAnalytics {
  userId: string;
  totalEvents: number;
  projectCount: number;
  eventTypes: Record<string, number>;
  lastActive: string;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalJobs: number;
  totalEvents: number;
  popularStyles: { style: string; count: number }[];
}

// In-memory event store
const events: AnalyticsEvent[] = [];

export function trackEvent(data: {
  type: string;
  userId: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: uuidv4(),
    type: data.type,
    userId: data.userId,
    projectId: data.projectId,
    metadata: data.metadata || {},
    timestamp: data.timestamp || new Date().toISOString(),
  };

  events.push(event);
  return event;
}

export function getProjectAnalytics(projectId: string): ProjectAnalytics {
  const projectEvents = events.filter((e) => e.projectId === projectId);

  const generationEvents = projectEvents.filter(
    (e) => e.type === "generation" || e.type === "job_complete"
  );

  const qualityScores = projectEvents
    .filter((e) => typeof e.metadata.quality === "number")
    .map((e) => e.metadata.quality as number);

  const averageQuality =
    qualityScores.length > 0
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 0;

  const creditUsage = projectEvents
    .filter((e) => typeof e.metadata.credits === "number")
    .reduce((sum, e) => sum + (e.metadata.credits as number), 0);

  return {
    projectId,
    generationCount: generationEvents.length,
    averageQuality: Math.round(averageQuality * 100) / 100,
    creditUsage,
    eventCount: projectEvents.length,
  };
}

export function getUserAnalytics(userId: string): UserAnalytics {
  const userEvents = events.filter((e) => e.userId === userId);

  const projectIds = new Set(
    userEvents.filter((e) => e.projectId).map((e) => e.projectId)
  );

  const eventTypes: Record<string, number> = {};
  for (const e of userEvents) {
    eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
  }

  const sorted = [...userEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    userId,
    totalEvents: userEvents.length,
    projectCount: projectIds.size,
    eventTypes,
    lastActive: sorted.length > 0 ? sorted[0].timestamp : "",
  };
}

export function getPlatformAnalytics(): PlatformAnalytics {
  const uniqueUsers = new Set(events.map((e) => e.userId));

  const jobEvents = events.filter(
    (e) =>
      e.type === "job_complete" ||
      e.type === "job_failed" ||
      e.type === "generation"
  );

  // Count styles from metadata
  const styleCounts: Record<string, number> = {};
  for (const e of events) {
    if (typeof e.metadata.style === "string") {
      const style = e.metadata.style;
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }
  }

  const popularStyles = Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalUsers: uniqueUsers.size,
    totalJobs: jobEvents.length,
    totalEvents: events.length,
    popularStyles,
  };
}

export function clearAll(): void {
  events.length = 0;
}
