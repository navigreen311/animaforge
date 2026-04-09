// ---------------------------------------------------------------------------
//  AnimaForge – Email Trigger Functions
//  Checks conditions before sending transactional emails.
// ---------------------------------------------------------------------------

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
//  Stub DB helpers — replace with real queries
// ---------------------------------------------------------------------------

async function getUser(_userId: string): Promise<UserRecord | null> {
  // TODO: Replace with actual DB query
  console.warn('[email/triggers] getUser is a stub — wire up your DB');
  return null;
}

async function markWelcomeEmailSent(_userId: string): Promise<void> {
  // TODO: UPDATE users SET welcome_email_sent = true WHERE id = ?
}

async function markCreditsLowNotified(_userId: string): Promise<void> {
  // TODO: UPDATE users SET credits_low_notified_at = NOW() WHERE id = ?
}

async function getUserWeeklyActivity(_userId: string): Promise<WeeklyActivity | null> {
  // TODO: Aggregate shots, approved, credits for the past 7 days
  return null;
}

async function getUserJobCount(_userId: string): Promise<number> {
  // TODO: SELECT COUNT(*) FROM jobs WHERE user_id = ?
  return 0;
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
      'Share your journey — we'd love to feature you',
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

export async function triggerRenderComplete(
  userId: string,
  jobData: JobData,
): Promise<void> {
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
    html: renderFailedEmail(
      jobData.projectName,
      jobData.shotNumber,
      reason,
      creditsRefunded,
    ),
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

export async function checkMilestones(
  userId: string,
  jobCount?: number,
): Promise<void> {
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
