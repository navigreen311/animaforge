export const MILESTONES = {
  1: {
    key: 'first_shot',
    subject: 'You just created your first AI shot',
    tips: ['Try different camera angles', 'Explore the Style Studio'],
  },
  10: {
    key: 'tenth_shot',
    subject: "10 shots in — you're building momentum",
    tips: ['Use the approval workflow', 'Browse the style library'],
  },
  50: {
    key: 'fiftieth_shot',
    subject: "50 shots! You're a pro",
    tips: ['Try batch generation', 'Create a brand kit'],
  },
};

export async function checkAndTriggerMilestones(
  userId: string,
  completedJobCount: number
) {
  const milestone =
    MILESTONES[completedJobCount as keyof typeof MILESTONES];
  if (!milestone) return;

  // In production: check if already triggered in DB, send email if not
  console.log(`[milestone] User ${userId} reached: ${milestone.key}`);
}
