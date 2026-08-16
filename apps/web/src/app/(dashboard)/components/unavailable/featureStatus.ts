/**
 * Why a given control cannot do its job yet.
 *
 * Every entry here replaced a `toast('… coming soon')` — a control that fired,
 * said nothing useful, and left the user to guess whether they had done
 * something wrong. "Coming soon" is not information: it does not say what is
 * missing, who could fix it, or whether waiting will help.
 *
 * Each `detail` below is a claim about this repository that was checked before
 * being written down. If one of them stops being true, the control should stop
 * being disabled — not have its wording softened.
 */

export type Blocker =
  /** Needs a credential or account this repository does not have. */
  | 'vendor-credential'
  /** Simply not implemented. */
  | 'not-built';

export interface FeatureStatus {
  /** Shown next to the control. Short enough to sit inline. */
  summary: string;
  /** The full explanation, surfaced on hover/focus and to screen readers. */
  detail: string;
  blocker: Blocker;
  /** Tracking issue, where one exists. */
  issue?: number;
}

export const FEATURE_STATUS = {
  /* -- team ---------------------------------------------------------------- */

  'projects.import': {
    summary: 'No importer exists',
    detail:
      'Creating a project persists — POST /api/projects survives a platform-api ' +
      'restart (run 31925346146) — so this is no longer a storage problem. What ' +
      'is missing is the import itself: nothing in this repository parses a ' +
      'project archive or a screenplay into scenes and shots, and there is no ' +
      '/api/projects/import route to send a file to. Use New Project and add ' +
      'scenes by hand.',
    blocker: 'not-built',
  },

  'team.activityLog': {
    summary: 'Nothing records activity yet',
    detail:
      'The feed now reads the real AuditTrail table through GET /api/v1/activity, ' +
      'so the endpoint is no longer sample data. Nothing writes to that table: ' +
      'after creating a team, a project and an invitation against a real ' +
      'database, /api/v1/activity returned total: 0 (run 31925346146). The ' +
      'gap is a recording call on the write paths, not a missing store.',
    blocker: 'not-built',
  },

  'team.transferOwnership': {
    summary: 'Needs an identity provider',
    detail:
      'Transferring ownership has to re-authenticate the current owner before ' +
      'reassigning the Organization record, and AUTH_PROVIDER (Auth0 or Clerk) ' +
      'is not configured. The record itself persists — teams and org ' +
      'membership survive a platform-api restart (run 31925346146) — so the ' +
      'step-up authentication is the only thing missing.',
    blocker: 'vendor-credential',
  },

  'team.projectAccess': {
    summary: 'No per-project access model exists',
    detail:
      'Membership in packages/db/prisma is team-to-user only — it has teamId, ' +
      'userId and role, and no project dimension — and no endpoint accepts a ' +
      'per-project grant. Teams themselves persist (run 31925346146), so this ' +
      'is not the persistence layer: there is nowhere to record that one member ' +
      'may see one project.',
    blocker: 'not-built',
  },

  /* -- account and security ------------------------------------------------ */

  'auth.passwordChange': {
    summary: 'Needs an identity provider',
    detail:
      'Passwords are held by the identity provider, not this application. ' +
      'AUTH_PROVIDER and AUTH_PROVIDER_SECRET are unset, so there is no ' +
      'account to change a password on.',
    blocker: 'vendor-credential',
  },

  'auth.twoFactor': {
    summary: 'Needs an identity provider',
    detail:
      'TOTP enrolment and recovery codes are issued by the identity provider. ' +
      'AUTH_PROVIDER and AUTH_PROVIDER_SECRET are unset, so enrolment cannot ' +
      'be started or verified.',
    blocker: 'vendor-credential',
  },

  /* -- billing ------------------------------------------------------------- */

  'billing.upgrade': {
    summary: 'Needs Stripe credentials',
    detail:
      'POST /api/billing/checkout returns the literal string ' +
      '"/mock-stripe-checkout" rather than a Stripe Checkout session. ' +
      'STRIPE_SECRET_KEY is unset and the price IDs are placeholders.',
    blocker: 'vendor-credential',
  },

  'billing.comparePlans': {
    summary: 'Needs Stripe credentials',
    detail:
      'Plan pricing would have to come from the Stripe catalogue. The price ' +
      'IDs in .env.example are placeholders (price_creator_placeholder), so ' +
      'any figures shown here would be invented.',
    blocker: 'vendor-credential',
  },

  'billing.updateCard': {
    summary: 'Needs Stripe credentials',
    detail:
      'POST /api/billing/portal returns the literal string ' +
      '"/mock-stripe-portal", not a Stripe billing portal session. Card details ' +
      'must never be collected outside Stripe, so there is no fallback here.',
    blocker: 'vendor-credential',
  },

  /* -- settings ------------------------------------------------------------ */

  /* -- content ------------------------------------------------------------- */

  'assets.preview3d': {
    summary: 'No 3D viewer is built',
    detail:
      'Rendering a model in the browser needs a WebGL viewer that can load glTF ' +
      'or PLY. None is implemented here, and three.js is not a dependency of ' +
      'apps/web.',
    blocker: 'not-built',
  },

  /* -- integrations -------------------------------------------------------- */

  'analytics.connectPlatform': {
    summary: 'Needs platform OAuth apps',
    detail:
      'POST /api/analytics/connect returns 501: connecting YouTube, TikTok or ' +
      'Meta requires a registered OAuth application per platform, and neither ' +
      'YOUTUBE_OAUTH_CLIENT_ID nor its secret is configured, so there is no ' +
      'authorisation URL to send you to.',
    blocker: 'vendor-credential',
  },

  'voice.uploadSample': {
    summary: 'Upload is not wired to the API yet',
    detail:
      'Persistence is no longer the blocker: POST /api/v1/voices followed by a ' +
      'platform-api restart returns the voice from Postgres (run 31925346146). ' +
      'The control still needs wiring in components/shared/VoiceSelectorModal, ' +
      'which sits outside the paths this change owns.',
    blocker: 'not-built',
  },

  'billing.mobilePurchase': {
    summary: 'Needs store billing',
    detail:
      'Plan changes on mobile must go through StoreKit on iOS and Google Play ' +
      'Billing on Android; apps/mobile integrates neither, and the web ' +
      'checkout route returns the literal string "/mock-stripe-checkout".',
    blocker: 'vendor-credential',
  },

  /* -- navigation ---------------------------------------------------------- */

  'nav.unbuiltRoute': {
    summary: 'This page is not built',
    detail:
      'This entry is marked disabled in the sidebar config and has no page ' +
      'under apps/web/src/app. It is listed so the intended shape of the ' +
      'product stays visible, not because it is reachable.',
    blocker: 'not-built',
  },
} as const satisfies Record<string, FeatureStatus>;

export type FeatureKey = keyof typeof FEATURE_STATUS;

export function getFeatureStatus(key: FeatureKey): FeatureStatus {
  return FEATURE_STATUS[key];
}

/**
 * One line combining the summary with its tracking issue, for a `title`
 * attribute or a mobile alert body.
 */
export function explainFeature(key: FeatureKey): string {
  const status = getFeatureStatus(key);
  return status.issue ? `${status.detail} (see issue #${status.issue})` : status.detail;
}
