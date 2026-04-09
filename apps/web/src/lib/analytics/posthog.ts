export function initAnalytics() {
  if (typeof window === 'undefined') return;
  // Check cookie consent before initializing
  const consent = localStorage.getItem('af-cookie-consent');
  if (!consent) return;
  const parsed = JSON.parse(consent);
  if (!parsed.analytics) return;

  console.log('[posthog] Would initialize with key:', process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export const track = {
  projectCreated: (projectType: string) => trackEvent('project_created', { type: projectType }),
  shotGenerated: (tier: string, duration: number) => trackEvent('shot_generated', { tier, duration }),
  shotApproved: (projectId: string) => trackEvent('shot_approved', { project_id: projectId }),
  styleApplied: (styleId: string, source: string) => trackEvent('style_applied', { style_id: styleId, source }),
  exportCompleted: (format: string, shotCount: number) => trackEvent('export_completed', { format, shot_count: shotCount }),
  planUpgraded: (from: string, to: string) => trackEvent('plan_upgraded', { from, to }),
  onboardingCompleted: (template: string) => trackEvent('onboarding_completed', { template }),
  pageView: (path: string) => trackEvent('$pageview', { path }),
};

function trackEvent(event: string, properties?: Record<string, any>) {
  console.log('[analytics]', event, properties);
  // In production: PostHog.capture(event, properties);
}
