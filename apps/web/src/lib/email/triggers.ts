// ---------------------------------------------------------------------------
//  AnimaForge – Email Trigger Functions
//  Checks conditions before sending transactional emails.
// ---------------------------------------------------------------------------

import { prisma } from '@animaforge/db';
import { sendEmail } from './send';
import {
  welcomeEmail,
  renderCompleteEmail,
  renderFailedEmail,
  creditsLowEmail,
  weeklyDigestEmail,
  milestoneEmail,
} from './templates';

// ---------------------------------------------------------------------------
//  Types (minimal — replace with your DB/ORM types)
// ---------------------------------------------------------------------------

interface UserRecord {
  id: string;
  email: string;
  name: string;
  welcomeEmailSent?: boolean;
  creditsLowNotifiedAt?: string | null;
  billingPeriodStart?: string;
}

interface JobData {
  projectName: string;
  shotNumber: number;
  thumbnail?: string;
  qualityScores: { overall: number; consistency?: number; motion?: number };
  tier: 'draft' | 'preview' | 'final';
}

interface WeeklyActivity {
  shots: number;
  approved: number;
  credits: number;
  topProject?: string;
}

// ---------------------------------------------------------------------------
//  Database access
// ---------------------------------------------------------------------------

/**
 * These were five stubs that returned null or zero. The effect was that every
 * trigger in this file silently did nothing: `getUser` returned null, so
 * `triggerWelcomeEmail` returned before sending, and the milestone and digest
 * triggers computed against empty data. Nothing threw, so nothing looked wrong.
 *
 * They are real queries now. `prisma` from @animaforge/db is null when the
 * client has not been generated, so each helper throws a named error instead of
 * degrading to the old silent no-op — a mail trigger that cannot reach the
 * database should be a visible failure, not a quiet one.
 */

const CREDITS_LOW_NOTIFICATION_TYPE = 'credits_low';

function db() {
  if (!prisma) {
    throw new Error(
      '[email/triggers] No database connection. @animaforge/db returned a null ' +
        'client, which means Prisma has not been generated (npm run db:generate ' +
        'in packages/db) or DATABASE_URL is unset.',
    );
  }
  return prisma;
}

async function getUser(userId: string): Promise<UserRecord | null> {
  const user = await db().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      welcomeEmailSent: true,
      createdAt: true,
    },
  });

  if (!user || !user.email) return null;

  // The schema has no creditsLowNotifiedAt column. Rather than invent one — the
  // Prisma schema is owned by another track — the last credits-low Notification
  // serves as the record of when the user was told.
  const lastCreditsLow = await db().notification.findFirst({
    where: { userId, type: CREDITS_LOW_NOTIFICATION_TYPE },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.displayName ?? user.email.split('@')[0],
    welcomeEmailSent: user.welcomeEmailSent,
    creditsLowNotifiedAt: lastCreditsLow?.createdAt.toISOString() ?? null,
    billingPeriodStart: user.createdAt.toISOString(),
  };
}

async function markWelcomeEmailSent(userId: string): Promise<void> {
  await db().user.update({
    where: { id: userId },
    data: { welcomeEmailSent: true },
  });
}

async function markCreditsLowNotified(userId: string): Promise<void> {
  // Doubles as the notification the user sees in-app and as the timestamp
  // getUser reads back to avoid re-sending.
  await db().notification.create({
    data: {
      userId,
      type: CREDITS_LOW_NOTIFICATION_TYPE,
      title: 'Credits running low',
      body: 'You are close to your credit limit for this billing period.',
      actionUrl: '/settings?tab=billing',
    },
  });
}

async function getUserWeeklyActivity(userId: string): Promise<WeeklyActivity | null> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const client = db();

  const [jobs, approved, creditsUsed] = await Promise.all([
    // Shots rendered: completed generation jobs in the window.
    client.generationJob.findMany({
      where: { userId, status: 'complete', completedAt: { gte: since } },
      select: { projectId: true },
    }),
    client.shot.count({
      where: { approvedBy: userId, approvedAt: { gte: since } },
    }),
    client.generationJob.aggregate({
      where: { userId, createdAt: { gte: since } },
      _sum: { costCredits: true },
    }),
  ]);

  // A digest with nothing in it is worse than no digest: it is an email that
  // exists only to say you did not use the product.
  if (jobs.length === 0 && approved === 0) return null;

  const perProject = new Map<string, number>();
  for (const job of jobs) {
    perProject.set(job.projectId, (perProject.get(job.projectId) ?? 0) + 1);
  }

  let topProjectId: string | undefined;
  let topCount = 0;
  for (const [projectId, count] of perProject) {
    if (count > topCount) {
      topCount = count;
      topProjectId = projectId;
    }
  }

  const topProject = topProjectId
    ? await client.project.findUnique({
        where: { id: topProjectId },
        select: { title: true },
      })
    : null;

  return {
    shots: jobs.length,
    approved,
    credits: Math.round(creditsUsed._sum.costCredits ?? 0),
    topProject: topProject?.title,
  };
}

async function getUserJobCount(userId: string): Promise<number> {
  // Milestones count finished work, so queued and failed jobs do not advance
  // someone toward "100 Shots".
  return db().generationJob.count({
    where: { userId, status: 'complete' },
  });
}

// ---------------------------------------------------------------------------
//  Milestone definitions
// ---------------------------------------------------------------------------

const MILESTONES: { threshold: number; label: string; tips: string[] }[] = [
  {
    threshold: 1,
    label: 'First Render!',
    tips: [
      'Try different style modes to find your look',
      'Use the character builder for consistent results',
      'Check out community projects for inspiration',
    ],
  },
  {
    threshold: 10,
    label: '10 Shots Rendered',
    tips: [
      'Batch similar shots to save credits',
      'Use the timeline view for better sequencing',
      'Explore the marketplace for pre-built assets',
    ],
  },
  {
    threshold: 50,
    label: '50 Shots — Power Creator',
    tips: [
      'Consider upgrading for priority rendering',
      'Share your best work on the community board',
      'Try the API for automated workflows',
    ],
  },
  {
    threshold: 100,
    label: '100 Shots — Animation Pro',
    tips: [
      'Apply for the creator partnership program',
      'List your assets on the marketplace',
      'Join the AnimaForge Discord for pro tips',
    ],
  },
  {
    threshold: 500,
    label: '500 Shots — Studio Legend',
    tips: [
      'You qualify for enterprise-tier features',
      'Contact us about custom model training',
      "Share your journey — we'd love to feature you",
    ],
  },
];

// ---------------------------------------------------------------------------
//  Trigger: Welcome Email
// ---------------------------------------------------------------------------

export async function triggerWelcomeEmail(userId: string): Promise<void> {
  const user = await getUser(userId);
  if (!user || user.welcomeEmailSent) return;

  const DEFAULT_CREDITS = 50;

  await sendEmail({
    to: user.email,
    subject: 'Welcome to AnimaForge — your credits are ready!',
    html: welcomeEmail(user.name, DEFAULT_CREDITS),
  });

  await markWelcomeEmailSent(userId);
}

// ---------------------------------------------------------------------------
//  Trigger: Render Complete (Final tier only)
// ---------------------------------------------------------------------------

export async function triggerRenderComplete(userId: string, jobData: JobData): Promise<void> {
  if (jobData.tier !== 'final') return;

  const user = await getUser(userId);
  if (!user) return;

  await sendEmail({
    to: user.email,
    subject: `Shot #${jobData.shotNumber} is ready — ${jobData.projectName}`,
    html: renderCompleteEmail(
      jobData.projectName,
      jobData.shotNumber,
      jobData.thumbnail,
      jobData.qualityScores,
    ),
  });
}

// ---------------------------------------------------------------------------
//  Trigger: Render Failed
// ---------------------------------------------------------------------------

export async function triggerRenderFailed(
  userId: string,
  jobData: Pick<JobData, 'projectName' | 'shotNumber'>,
  reason: string,
  creditsRefunded = 0,
): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  await sendEmail({
    to: user.email,
    subject: `Render failed — Shot #${jobData.shotNumber} in ${jobData.projectName}`,
    html: renderFailedEmail(jobData.projectName, jobData.shotNumber, reason, creditsRefunded),
  });
}

// ---------------------------------------------------------------------------
//  Trigger: Credits Low (once per billing period)
// ---------------------------------------------------------------------------

export async function triggerCreditsLow(
  userId: string,
  remaining: number,
  burnRate?: number,
): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  // Only notify once per billing period
  if (user.creditsLowNotifiedAt && user.billingPeriodStart) {
    const notifiedAt = new Date(user.creditsLowNotifiedAt);
    const periodStart = new Date(user.billingPeriodStart);
    if (notifiedAt >= periodStart) return;
  }

  await sendEmail({
    to: user.email,
    subject: `You have ${remaining} credits remaining`,
    html: creditsLowEmail(user.name, remaining, burnRate),
  });

  await markCreditsLowNotified(userId);
}

// ---------------------------------------------------------------------------
//  Trigger: Weekly Digest (only if active that week)
// ---------------------------------------------------------------------------

export async function triggerWeeklyDigest(userId: string): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  const activity = await getUserWeeklyActivity(userId);
  if (!activity || activity.shots === 0) return;

  await sendEmail({
    to: user.email,
    subject: `Your AnimaForge week: ${activity.shots} shots rendered`,
    html: weeklyDigestEmail(
      user.name,
      { shots: activity.shots, approved: activity.approved, credits: activity.credits },
      activity.topProject,
    ),
  });
}

// ---------------------------------------------------------------------------
//  Trigger: Milestone Check
// ---------------------------------------------------------------------------

export async function checkMilestones(userId: string, jobCount?: number): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;

  const count = jobCount ?? (await getUserJobCount(userId));

  // Find the exact milestone hit (only triggers at the threshold, not above)
  const milestone = MILESTONES.find((m) => m.threshold === count);
  if (!milestone) return;

  await sendEmail({
    to: user.email,
    subject: `🏆 Milestone: ${milestone.label}`,
    html: milestoneEmail(user.name, milestone.label, milestone.tips),
  });
}
