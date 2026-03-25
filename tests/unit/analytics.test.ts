import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the @clickhouse/client module before any imports that depend on it
vi.mock('@clickhouse/client', () => ({
  createClient: () => null,
}));

import {
  ingestEvent,
  batchIngest,
  getProjectAnalytics,
  getUserAnalytics,
  getPlatformAnalytics,
  getRetentionCohorts,
  clearAll,
} from '../../services/analytics/src/services/analyticsService';

beforeEach(() => {
  clearAll();
});

// ---------------------------------------------------------------------------
// 1. Event ingest
// ---------------------------------------------------------------------------
describe('Analytics - Event Ingest', () => {
  it('ingests a single event and returns it with an id', async () => {
    const evt = await ingestEvent({
      type: 'generation', userId: 'user-a1', projectId: 'proj-a1',
      metadata: { style: 'anime', credits: 5 },
    });
    expect(evt.id).toBeDefined();
    expect(evt.type).toBe('generation');
    expect(evt.userId).toBe('user-a1');
    expect(evt.metadata.style).toBe('anime');
  });
});

// ---------------------------------------------------------------------------
// 2. Batch ingest
// ---------------------------------------------------------------------------
describe('Analytics - Batch Ingest', () => {
  it('ingests multiple events at once', async () => {
    const events = await batchIngest([
      { type: 'generation', userId: 'u1', projectId: 'p1', metadata: { style: 'comic' } },
      { type: 'job_complete', userId: 'u1', projectId: 'p1', metadata: { credits: 3 } },
      { type: 'view', userId: 'u2', projectId: 'p1' },
    ]);
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('generation');
    expect(events[2].userId).toBe('u2');
  });
});

// ---------------------------------------------------------------------------
// 3. Project analytics
// ---------------------------------------------------------------------------
describe('Analytics - Project Analytics', () => {
  it('aggregates generation counts and credit usage', async () => {
    await batchIngest([
      { type: 'generation', userId: 'u1', projectId: 'p-an', metadata: { generationType: 'video', credits: 10, quality: 0.9, renderTime: 12 } },
      { type: 'generation', userId: 'u1', projectId: 'p-an', metadata: { generationType: 'audio', credits: 5, quality: 0.8, renderTime: 4 } },
      { type: 'job_complete', userId: 'u2', projectId: 'p-an', metadata: { generationType: 'video', credits: 8, style: 'anime' } },
    ]);

    const analytics = await getProjectAnalytics('p-an');
    expect(analytics.projectId).toBe('p-an');
    expect(analytics.totalGenerations).toBe(3);
    expect(analytics.totalCreditsUsed).toBe(23);
    expect(analytics.generationsByType.video).toBe(2);
    expect(analytics.generationsByType.audio).toBe(1);
    expect(analytics.avgQualityScore).toBeGreaterThan(0);
    expect(analytics.avgRenderTime).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. User analytics
// ---------------------------------------------------------------------------
describe('Analytics - User Analytics', () => {
  it('aggregates user-level stats including most used style', async () => {
    await batchIngest([
      { type: 'generation', userId: 'ua-1', projectId: 'p1', metadata: { style: 'anime', credits: 5 } },
      { type: 'generation', userId: 'ua-1', projectId: 'p2', metadata: { style: 'anime', credits: 3 } },
      { type: 'generation', userId: 'ua-1', projectId: 'p1', metadata: { style: 'comic', credits: 2 } },
    ]);

    const analytics = await getUserAnalytics('ua-1');
    expect(analytics.userId).toBe('ua-1');
    expect(analytics.totalProjects).toBe(2);
    expect(analytics.totalGenerations).toBe(3);
    expect(analytics.creditsUsed).toBe(10);
    expect(analytics.creditsRemaining).toBe(990);
    expect(analytics.mostUsedStyle).toBe('anime');
  });
});

// ---------------------------------------------------------------------------
// 5. Platform stats
// ---------------------------------------------------------------------------
describe('Analytics - Platform Stats', () => {
  it('computes platform-wide statistics', async () => {
    await batchIngest([
      { type: 'generation', userId: 'u1', projectId: 'p1', metadata: { credits: 10, style: 'anime' } },
      { type: 'generation', userId: 'u2', projectId: 'p2', metadata: { credits: 20, style: 'anime' } },
      { type: 'job_failed', userId: 'u1', projectId: 'p1' },
      { type: 'view', userId: 'u3', projectId: 'p1' },
    ]);

    const stats = await getPlatformAnalytics();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(3);
    expect(stats.totalJobs).toBe(3);
    expect(stats.revenueEstimate).toBe(3);
    expect(stats.topCreators.length).toBeGreaterThan(0);
    expect(stats.popularStyles[0].style).toBe('anime');
  });
});

// ---------------------------------------------------------------------------
// 6. Retention cohorts
// ---------------------------------------------------------------------------
describe('Analytics - Retention Cohorts', () => {
  it('calculates retention cohorts from event data', async () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    await batchIngest([
      { type: 'generation', userId: 'ret-u1', timestamp: lastMonth.toISOString() },
      { type: 'generation', userId: 'ret-u1', timestamp: now.toISOString() },
      { type: 'generation', userId: 'ret-u2', timestamp: lastMonth.toISOString() },
    ]);

    const { cohorts } = await getRetentionCohorts('monthly');
    expect(cohorts.length).toBeGreaterThan(0);
    expect(cohorts[0].users).toBeGreaterThanOrEqual(1);
    expect(typeof cohorts[0].rate).toBe('number');
  });
});
