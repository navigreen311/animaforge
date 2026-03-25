import { v4 as uuidv4 } from "uuid";
import { getClickHouseClient, isClickHouseConnected } from "../db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  projectId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface ProjectAnalytics {
  projectId: string;
  totalGenerations: number;
  avgQualityScore: number;
  totalCreditsUsed: number;
  generationsByType: { video: number; audio: number; avatar: number; style: number };
  topStyles: { style: string; count: number }[];
  dailyGenerations: { date: string; count: number }[];
  avgRenderTime: number;
}

export interface UserAnalytics {
  userId: string;
  totalProjects: number;
  totalGenerations: number;
  creditsUsed: number;
  creditsRemaining: number;
  mostUsedStyle: string;
  generationHistory: { date: string; type: string; projectId: string }[];
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  revenueEstimate: number;
  topCreators: { userId: string; generations: number }[];
  popularStyles: { style: string; count: number }[];
  peakHours: { hour: number; count: number }[];
}

export interface ContentAnalytics {
  projectId: string;
  viewCount: number;
  shareCount: number;
  exportCount: number;
  avgWatchTime: number;
  engagementRate: number;
}

export interface RetentionCohort {
  period: string;
  users: number;
  retained: number;
  rate: number;
}

// ---------------------------------------------------------------------------
// In-memory store (fallback when ClickHouse is unavailable)
// ---------------------------------------------------------------------------

const memoryStore: AnalyticsEvent[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateFilter(events: AnalyticsEvent[], range?: DateRange): AnalyticsEvent[] {
  let filtered = events;
  if (range?.from) {
    const from = new Date(range.from).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= from);
  }
  if (range?.to) {
    const to = new Date(range.to).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= to);
  }
  return filtered;
}

function buildDateClause(range?: DateRange): { clause: string; params: Record<string, string> } {
  const parts: string[] = [];
  const params: Record<string, string> = {};
  if (range?.from) {
    parts.push("timestamp >= {from:DateTime64(3)}");
    params.from = range.from;
  }
  if (range?.to) {
    parts.push("timestamp <= {to:DateTime64(3)}");
    params.to = range.to;
  }
  return { clause: parts.length ? ` AND ${parts.join(" AND ")}` : "", params };
}

// SQL single-quote helper for ClickHouse literals inside template strings
const Q = (s: string) => `'${s}'`;

// ---------------------------------------------------------------------------
// ingestEvent
// ---------------------------------------------------------------------------

export async function ingestEvent(data: {
  type: string;
  userId: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}): Promise<AnalyticsEvent> {
  const event: AnalyticsEvent = {
    id: uuidv4(),
    type: data.type,
    userId: data.userId,
    projectId: data.projectId,
    metadata: data.metadata || {},
    timestamp: data.timestamp || new Date().toISOString(),
  };

  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    await ch.insert({
      table: "events",
      values: [
        {
          id: event.id,
          type: event.type,
          user_id: event.userId,
          project_id: event.projectId || "",
          metadata: JSON.stringify(event.metadata),
          timestamp: event.timestamp,
        },
      ],
      format: "JSONEachRow",
    });
  } else {
    memoryStore.push(event);
  }

  return event;
}

// ---------------------------------------------------------------------------
// batchIngest
// ---------------------------------------------------------------------------

export async function batchIngest(
  items: {
    type: string;
    userId: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
    timestamp?: string;
  }[]
): Promise<AnalyticsEvent[]> {
  const events: AnalyticsEvent[] = items.map((d) => ({
    id: uuidv4(),
    type: d.type,
    userId: d.userId,
    projectId: d.projectId,
    metadata: d.metadata || {},
    timestamp: d.timestamp || new Date().toISOString(),
  }));

  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    await ch.insert({
      table: "events",
      values: events.map((e) => ({
        id: e.id,
        type: e.type,
        user_id: e.userId,
        project_id: e.projectId || "",
        metadata: JSON.stringify(e.metadata),
        timestamp: e.timestamp,
      })),
      format: "JSONEachRow",
    });
  } else {
    memoryStore.push(...events);
  }

  return events;
}

// ---------------------------------------------------------------------------
// getProjectAnalytics
// ---------------------------------------------------------------------------

export async function getProjectAnalytics(
  projectId: string,
  range?: DateRange
): Promise<ProjectAnalytics> {
  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    const { clause, params } = buildDateClause(range);
    const baseParams = { ...params, projectId };

    const genTypes = `(${Q("generation")},${Q("job_complete")})`;

    const [countRes, qualityRes, creditsRes, typeRes, styleRes, dailyRes, renderRes] =
      await Promise.all([
        ch.query({ query: `SELECT count() as cnt FROM events WHERE project_id = {projectId:String} AND type IN ${genTypes}${clause}`, query_params: baseParams, format: "JSONEachRow" }),
        ch.query({ query: `SELECT avg(JSONExtractFloat(metadata, ${Q("quality")})) as avg_q FROM events WHERE project_id = {projectId:String} AND JSONHas(metadata, ${Q("quality")})${clause}`, query_params: baseParams, format: "JSONEachRow" }),
        ch.query({ query: `SELECT sum(JSONExtractFloat(metadata, ${Q("credits")})) as total FROM events WHERE project_id = {projectId:String} AND JSONHas(metadata, ${Q("credits")})${clause}`, query_params: baseParams, format: "JSONEachRow" }),
        ch.query({ query: `SELECT JSONExtractString(metadata, ${Q("generationType")}) as gtype, count() as cnt FROM events WHERE project_id = {projectId:String} AND type IN ${genTypes}${clause} GROUP BY gtype`, query_params: baseParams, format: "JSONEachRow" }),
        ch.query({ query: `SELECT JSONExtractString(metadata, ${Q("style")}) as style, count() as cnt FROM events WHERE project_id = {projectId:String} AND JSONHas(metadata, ${Q("style")})${clause} GROUP BY style ORDER BY cnt DESC LIMIT 10`, query_params: baseParams, format: "JSONEachRow" }),
        ch.query({ query: `SELECT toDate(timestamp) as day, count() as cnt FROM events WHERE project_id = {projectId:String} AND type IN ${genTypes}${clause} GROUP BY day ORDER BY day`, query_params: baseParams, format: "JSONEachRow" }),
        ch.query({ query: `SELECT avg(JSONExtractFloat(metadata, ${Q("renderTime")})) as avg_rt FROM events WHERE project_id = {projectId:String} AND JSONHas(metadata, ${Q("renderTime")})${clause}`, query_params: baseParams, format: "JSONEachRow" }),
      ]);

    const count = await countRes.json<{ cnt: string }[]>();
    const quality = await qualityRes.json<{ avg_q: number }[]>();
    const credits = await creditsRes.json<{ total: number }[]>();
    const types = await typeRes.json<{ gtype: string; cnt: string }[]>();
    const styles = await styleRes.json<{ style: string; cnt: string }[]>();
    const daily = await dailyRes.json<{ day: string; cnt: string }[]>();
    const render = await renderRes.json<{ avg_rt: number }[]>();

    const byType = { video: 0, audio: 0, avatar: 0, style: 0 };
    for (const t of types) {
      if (t.gtype in byType) (byType as Record<string, number>)[t.gtype] = Number(t.cnt);
    }

    return {
      projectId,
      totalGenerations: Number(count[0]?.cnt || 0),
      avgQualityScore: Math.round((quality[0]?.avg_q || 0) * 100) / 100,
      totalCreditsUsed: Number(credits[0]?.total || 0),
      generationsByType: byType,
      topStyles: styles.map((s) => ({ style: s.style, count: Number(s.cnt) })),
      dailyGenerations: daily.map((d) => ({ date: d.day, count: Number(d.cnt) })),
      avgRenderTime: Math.round((render[0]?.avg_rt || 0) * 100) / 100,
    };
  }

  // --- In-memory fallback ---
  const projectEvents = dateFilter(
    memoryStore.filter((e) => e.projectId === projectId),
    range
  );

  const genEvents = projectEvents.filter(
    (e) => e.type === "generation" || e.type === "job_complete"
  );

  const qualityScores = projectEvents
    .filter((e) => typeof e.metadata.quality === "number")
    .map((e) => e.metadata.quality as number);

  const avgQualityScore =
    qualityScores.length > 0
      ? Math.round(
          (qualityScores.reduce((s, q) => s + q, 0) / qualityScores.length) * 100
        ) / 100
      : 0;

  const totalCreditsUsed = projectEvents
    .filter((e) => typeof e.metadata.credits === "number")
    .reduce((s, e) => s + (e.metadata.credits as number), 0);

  const byType = { video: 0, audio: 0, avatar: 0, style: 0 };
  for (const e of genEvents) {
    const gt = e.metadata.generationType as string | undefined;
    if (gt && gt in byType) (byType as Record<string, number>)[gt]++;
  }

  const styleCounts: Record<string, number> = {};
  for (const e of projectEvents) {
    if (typeof e.metadata.style === "string") {
      styleCounts[e.metadata.style] = (styleCounts[e.metadata.style] || 0) + 1;
    }
  }
  const topStyles = Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const dailyMap: Record<string, number> = {};
  for (const e of genEvents) {
    const day = e.timestamp.slice(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + 1;
  }
  const dailyGenerations = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const renderTimes = projectEvents
    .filter((e) => typeof e.metadata.renderTime === "number")
    .map((e) => e.metadata.renderTime as number);
  const avgRenderTime =
    renderTimes.length > 0
      ? Math.round(
          (renderTimes.reduce((s, t) => s + t, 0) / renderTimes.length) * 100
        ) / 100
      : 0;

  return {
    projectId,
    totalGenerations: genEvents.length,
    avgQualityScore,
    totalCreditsUsed,
    generationsByType: byType,
    topStyles,
    dailyGenerations,
    avgRenderTime,
  };
}

// ---------------------------------------------------------------------------
// getUserAnalytics
// ---------------------------------------------------------------------------

export async function getUserAnalytics(
  userId: string,
  range?: DateRange
): Promise<UserAnalytics> {
  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    const { clause, params } = buildDateClause(range);
    const baseParams = { ...params, userId };
    const genTypes = `(${Q("generation")},${Q("job_complete")})`;

    const [projRes, genRes, credRes, styleRes, histRes] = await Promise.all([
      ch.query({ query: `SELECT uniq(project_id) as cnt FROM events WHERE user_id = {userId:String} AND project_id != ${Q("")}${clause}`, query_params: baseParams, format: "JSONEachRow" }),
      ch.query({ query: `SELECT count() as cnt FROM events WHERE user_id = {userId:String} AND type IN ${genTypes}${clause}`, query_params: baseParams, format: "JSONEachRow" }),
      ch.query({ query: `SELECT sum(JSONExtractFloat(metadata, ${Q("credits")})) as total FROM events WHERE user_id = {userId:String} AND JSONHas(metadata, ${Q("credits")})${clause}`, query_params: baseParams, format: "JSONEachRow" }),
      ch.query({ query: `SELECT JSONExtractString(metadata, ${Q("style")}) as style, count() as cnt FROM events WHERE user_id = {userId:String} AND JSONHas(metadata, ${Q("style")})${clause} GROUP BY style ORDER BY cnt DESC LIMIT 1`, query_params: baseParams, format: "JSONEachRow" }),
      ch.query({ query: `SELECT toDate(timestamp) as date, type, project_id FROM events WHERE user_id = {userId:String} AND type IN ${genTypes}${clause} ORDER BY timestamp DESC LIMIT 50`, query_params: baseParams, format: "JSONEachRow" }),
    ]);

    const proj = await projRes.json<{ cnt: string }[]>();
    const gen = await genRes.json<{ cnt: string }[]>();
    const cred = await credRes.json<{ total: number }[]>();
    const styleRows = await styleRes.json<{ style: string; cnt: string }[]>();
    const hist = await histRes.json<{ date: string; type: string; project_id: string }[]>();

    const creditsUsed = Number(cred[0]?.total || 0);

    return {
      userId,
      totalProjects: Number(proj[0]?.cnt || 0),
      totalGenerations: Number(gen[0]?.cnt || 0),
      creditsUsed,
      creditsRemaining: Math.max(0, 1000 - creditsUsed),
      mostUsedStyle: styleRows[0]?.style || "none",
      generationHistory: hist.map((h) => ({
        date: h.date,
        type: h.type,
        projectId: h.project_id,
      })),
    };
  }

  // --- In-memory fallback ---
  const userEvents = dateFilter(
    memoryStore.filter((e) => e.userId === userId),
    range
  );

  const projectIds = new Set(
    userEvents.filter((e) => e.projectId).map((e) => e.projectId!)
  );

  const genEvents = userEvents.filter(
    (e) => e.type === "generation" || e.type === "job_complete"
  );

  const creditsUsed = userEvents
    .filter((e) => typeof e.metadata.credits === "number")
    .reduce((s, e) => s + (e.metadata.credits as number), 0);

  const styleCounts: Record<string, number> = {};
  for (const e of userEvents) {
    if (typeof e.metadata.style === "string") {
      styleCounts[e.metadata.style] = (styleCounts[e.metadata.style] || 0) + 1;
    }
  }
  const mostUsedStyle =
    Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";

  const generationHistory = genEvents
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 50)
    .map((e) => ({
      date: e.timestamp.slice(0, 10),
      type: e.type,
      projectId: e.projectId || "",
    }));

  return {
    userId,
    totalProjects: projectIds.size,
    totalGenerations: genEvents.length,
    creditsUsed,
    creditsRemaining: Math.max(0, 1000 - creditsUsed),
    mostUsedStyle,
    generationHistory,
  };
}

// ---------------------------------------------------------------------------
// getPlatformAnalytics
// ---------------------------------------------------------------------------

export async function getPlatformAnalytics(
  range?: DateRange
): Promise<PlatformAnalytics> {
  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    const { clause, params } = buildDateClause(range);
    const genTypes = `(${Q("generation")},${Q("job_complete")})`;
    const allJobTypes = `(${Q("generation")},${Q("job_complete")},${Q("job_failed")})`;
    const allStatusTypes = `(${Q("generation")},${Q("job_complete")},${Q("job_failed")},${Q("job_pending")})`;

    const [totalUsersRes, activeRes, jobsRes, statusRes, revRes, creatorsRes, stylesRes, hoursRes] =
      await Promise.all([
        ch.query({ query: `SELECT uniq(user_id) as cnt FROM events WHERE 1=1${clause}`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT uniq(user_id) as cnt FROM events WHERE timestamp >= now() - INTERVAL 30 DAY${clause}`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT count() as cnt FROM events WHERE type IN ${allJobTypes}${clause}`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT type, count() as cnt FROM events WHERE type IN ${allStatusTypes}${clause} GROUP BY type`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT sum(JSONExtractFloat(metadata, ${Q("credits")})) as total FROM events WHERE JSONHas(metadata, ${Q("credits")})${clause}`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT user_id, count() as cnt FROM events WHERE type IN ${genTypes}${clause} GROUP BY user_id ORDER BY cnt DESC LIMIT 10`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT JSONExtractString(metadata, ${Q("style")}) as style, count() as cnt FROM events WHERE JSONHas(metadata, ${Q("style")})${clause} GROUP BY style ORDER BY cnt DESC LIMIT 10`, query_params: params, format: "JSONEachRow" }),
        ch.query({ query: `SELECT toHour(timestamp) as hr, count() as cnt FROM events WHERE 1=1${clause} GROUP BY hr ORDER BY hr`, query_params: params, format: "JSONEachRow" }),
      ]);

    const totalUsers = await totalUsersRes.json<{ cnt: string }[]>();
    const active = await activeRes.json<{ cnt: string }[]>();
    const jobs = await jobsRes.json<{ cnt: string }[]>();
    const statuses = await statusRes.json<{ type: string; cnt: string }[]>();
    const rev = await revRes.json<{ total: number }[]>();
    const creators = await creatorsRes.json<{ user_id: string; cnt: string }[]>();
    const styles = await stylesRes.json<{ style: string; cnt: string }[]>();
    const hours = await hoursRes.json<{ hr: number; cnt: string }[]>();

    const jobsByStatus: Record<string, number> = {};
    for (const s of statuses) jobsByStatus[s.type] = Number(s.cnt);

    return {
      totalUsers: Number(totalUsers[0]?.cnt || 0),
      activeUsers: Number(active[0]?.cnt || 0),
      totalJobs: Number(jobs[0]?.cnt || 0),
      jobsByStatus,
      revenueEstimate: Number(rev[0]?.total || 0) * 0.1,
      topCreators: creators.map((c) => ({ userId: c.user_id, generations: Number(c.cnt) })),
      popularStyles: styles.map((s) => ({ style: s.style, count: Number(s.cnt) })),
      peakHours: hours.map((h) => ({ hour: Number(h.hr), count: Number(h.cnt) })),
    };
  }

  // --- In-memory fallback ---
  const filtered = dateFilter(memoryStore, range);

  const uniqueUsers = new Set(filtered.map((e) => e.userId));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeUsers = new Set(
    filtered.filter((e) => new Date(e.timestamp).getTime() >= thirtyDaysAgo).map((e) => e.userId)
  );

  const jobEvents = filtered.filter(
    (e) =>
      e.type === "generation" ||
      e.type === "job_complete" ||
      e.type === "job_failed"
  );

  const jobsByStatus: Record<string, number> = {};
  for (const e of filtered) {
    if (["generation", "job_complete", "job_failed", "job_pending"].includes(e.type)) {
      jobsByStatus[e.type] = (jobsByStatus[e.type] || 0) + 1;
    }
  }

  const totalCredits = filtered
    .filter((e) => typeof e.metadata.credits === "number")
    .reduce((s, e) => s + (e.metadata.credits as number), 0);

  const creatorCounts: Record<string, number> = {};
  for (const e of filtered) {
    if (e.type === "generation" || e.type === "job_complete") {
      creatorCounts[e.userId] = (creatorCounts[e.userId] || 0) + 1;
    }
  }
  const topCreators = Object.entries(creatorCounts)
    .map(([userId, generations]) => ({ userId, generations }))
    .sort((a, b) => b.generations - a.generations)
    .slice(0, 10);

  const styleCounts: Record<string, number> = {};
  for (const e of filtered) {
    if (typeof e.metadata.style === "string") {
      styleCounts[e.metadata.style] = (styleCounts[e.metadata.style] || 0) + 1;
    }
  }
  const popularStyles = Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const hourCounts: Record<number, number> = {};
  for (const e of filtered) {
    const hr = new Date(e.timestamp).getUTCHours();
    hourCounts[hr] = (hourCounts[hr] || 0) + 1;
  }
  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => a.hour - b.hour);

  return {
    totalUsers: uniqueUsers.size,
    activeUsers: activeUsers.size,
    totalJobs: jobEvents.length,
    jobsByStatus,
    revenueEstimate: totalCredits * 0.1,
    topCreators,
    popularStyles,
    peakHours,
  };
}

// ---------------------------------------------------------------------------
// getContentAnalytics
// ---------------------------------------------------------------------------

export async function getContentAnalytics(
  projectId: string
): Promise<ContentAnalytics> {
  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    const p = { projectId };

    const [viewRes, shareRes, exportRes, watchRes, totalRes] = await Promise.all([
      ch.query({ query: `SELECT count() as cnt FROM events WHERE project_id = {projectId:String} AND type = ${Q("view")}`, query_params: p, format: "JSONEachRow" }),
      ch.query({ query: `SELECT count() as cnt FROM events WHERE project_id = {projectId:String} AND type = ${Q("share")}`, query_params: p, format: "JSONEachRow" }),
      ch.query({ query: `SELECT count() as cnt FROM events WHERE project_id = {projectId:String} AND type = ${Q("export")}`, query_params: p, format: "JSONEachRow" }),
      ch.query({ query: `SELECT avg(JSONExtractFloat(metadata, ${Q("watchTime")})) as avg_wt FROM events WHERE project_id = {projectId:String} AND type = ${Q("view")} AND JSONHas(metadata, ${Q("watchTime")})`, query_params: p, format: "JSONEachRow" }),
      ch.query({ query: `SELECT count() as cnt FROM events WHERE project_id = {projectId:String}`, query_params: p, format: "JSONEachRow" }),
    ]);

    const views = Number((await viewRes.json<{ cnt: string }[]>())[0]?.cnt || 0);
    const shares = Number((await shareRes.json<{ cnt: string }[]>())[0]?.cnt || 0);
    const exports = Number((await exportRes.json<{ cnt: string }[]>())[0]?.cnt || 0);
    const avgWt = (await watchRes.json<{ avg_wt: number }[]>())[0]?.avg_wt || 0;
    const total = Number((await totalRes.json<{ cnt: string }[]>())[0]?.cnt || 0);

    const interactions = views + shares + exports;
    const engagementRate = total > 0 ? Math.round((interactions / total) * 10000) / 10000 : 0;

    return { projectId, viewCount: views, shareCount: shares, exportCount: exports, avgWatchTime: Math.round(avgWt * 100) / 100, engagementRate };
  }

  // --- In-memory fallback ---
  const projectEvents = memoryStore.filter((e) => e.projectId === projectId);

  const viewCount = projectEvents.filter((e) => e.type === "view").length;
  const shareCount = projectEvents.filter((e) => e.type === "share").length;
  const exportCount = projectEvents.filter((e) => e.type === "export").length;

  const watchTimes = projectEvents
    .filter((e) => e.type === "view" && typeof e.metadata.watchTime === "number")
    .map((e) => e.metadata.watchTime as number);

  const avgWatchTime =
    watchTimes.length > 0
      ? Math.round(
          (watchTimes.reduce((s, t) => s + t, 0) / watchTimes.length) * 100
        ) / 100
      : 0;

  const interactions = viewCount + shareCount + exportCount;
  const total = projectEvents.length;
  const engagementRate =
    total > 0 ? Math.round((interactions / total) * 10000) / 10000 : 0;

  return { projectId, viewCount, shareCount, exportCount, avgWatchTime, engagementRate };
}

// ---------------------------------------------------------------------------
// getRetentionCohorts
// ---------------------------------------------------------------------------

export async function getRetentionCohorts(
  period: "weekly" | "monthly" = "monthly"
): Promise<{ cohorts: RetentionCohort[] }> {
  if (isClickHouseConnected()) {
    const ch = getClickHouseClient()!;
    const trunc = period === "weekly" ? "toMonday" : "toStartOfMonth";

    const res = await ch.query({
      query: [
        "WITH first_seen AS (",
        `  SELECT user_id, ${trunc}(min(timestamp)) as cohort FROM events GROUP BY user_id`,
        "),",
        "activity AS (",
        `  SELECT user_id, ${trunc}(timestamp) as active_period FROM events GROUP BY user_id, active_period`,
        ")",
        "SELECT toString(fs.cohort) as period, count(DISTINCT fs.user_id) as users, count(DISTINCT a.user_id) as retained",
        "FROM first_seen fs",
        "LEFT JOIN activity a ON fs.user_id = a.user_id AND a.active_period > fs.cohort",
        "GROUP BY fs.cohort ORDER BY fs.cohort",
      ].join("\n"),
      format: "JSONEachRow",
    });

    const rows = await res.json<{ period: string; users: string; retained: string }[]>();

    return {
      cohorts: rows.map((r) => {
        const users = Number(r.users);
        const retained = Number(r.retained);
        return {
          period: r.period,
          users,
          retained,
          rate: users > 0 ? Math.round((retained / users) * 10000) / 10000 : 0,
        };
      }),
    };
  }

  // --- In-memory fallback ---
  const userFirstSeen: Record<string, string> = {};
  const userActivePeriods: Record<string, Set<string>> = {};

  const truncDate = (ts: string): string => {
    const d = new Date(ts);
    if (period === "weekly") {
      const day = d.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setUTCDate(d.getUTCDate() - diff);
    } else {
      d.setUTCDate(1);
    }
    return d.toISOString().slice(0, 10);
  };

  for (const e of memoryStore) {
    const p = truncDate(e.timestamp);
    if (!userFirstSeen[e.userId] || p < userFirstSeen[e.userId]) {
      userFirstSeen[e.userId] = p;
    }
    if (!userActivePeriods[e.userId]) userActivePeriods[e.userId] = new Set();
    userActivePeriods[e.userId].add(p);
  }

  const cohortMap: Record<string, { users: Set<string>; retained: Set<string> }> = {};

  for (const [userId, cohort] of Object.entries(userFirstSeen)) {
    if (!cohortMap[cohort]) cohortMap[cohort] = { users: new Set(), retained: new Set() };
    cohortMap[cohort].users.add(userId);

    const periods = userActivePeriods[userId];
    for (const p of periods) {
      if (p > cohort) {
        cohortMap[cohort].retained.add(userId);
        break;
      }
    }
  }

  const cohorts: RetentionCohort[] = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, data]) => {
      const users = data.users.size;
      const retained = data.retained.size;
      return {
        period: p,
        users,
        retained,
        rate: users > 0 ? Math.round((retained / users) * 10000) / 10000 : 0,
      };
    });

  return { cohorts };
}

// ---------------------------------------------------------------------------
// clearAll (for testing)
// ---------------------------------------------------------------------------

export function clearAll(): void {
  memoryStore.length = 0;
}
