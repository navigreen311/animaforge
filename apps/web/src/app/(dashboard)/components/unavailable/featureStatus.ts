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
  /** The UI and an API route exist, but nothing persists. */
  | 'no-persistence'
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

const NO_PERSISTENCE_ISSUE = 58;

export const FEATURE_STATUS = {
  /* -- team ---------------------------------------------------------------- */

  'team.create': {
    summary: 'Needs a persistence layer',
    detail:
      'POST /api/team/teams builds a team object and returns it without storing ' +
      'it anywhere, and GET returns two hardcoded teams. Creating a team would ' +
      'appear to succeed and be gone on refresh.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'team.manage': {
    summary: 'Needs a persistence layer',
    detail:
      'The sub-teams list comes from two hardcoded entries in ' +
      '/api/team/teams. There is nothing to edit that would survive a reload.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'team.activityLog': {
    summary: 'Needs a persistence layer',
    detail:
      'GET /api/team/members/[id]/activity serves generated sample events, not ' +
      'recorded ones. The AuditTrail model exists in packages/db/prisma but ' +
      'nothing writes to it from the web app.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'team.transferOwnership': {
    summary: 'Needs an identity provider',
    detail:
      'Transferring ownership has to re-authenticate the current owner and ' +
      'reassign the Organization record. AUTH_PROVIDER (Auth0 or Clerk) is not ' +
      'configured, and organisation membership is not persisted.',
    blocker: 'vendor-credential',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'team.invite': {
    summary: 'Invitations cannot be sent',
    detail:
      'POST /api/team/invite validates the request and returns success without ' +
      'recording an invitation or sending mail. The Send button used to wait ' +
      '1.2s and report "Invitation sent" for an email that never left.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'team.projectAccess': {
    summary: 'Access changes are not saved',
    detail:
      'Project access is held in component state over the hardcoded ' +
      'MOCK_PROJECT_ACCESS list. Saving used to wait 300ms and report "Project ' +
      'access updated" without persisting anything.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
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

  'settings.createWebhook': {
    summary: 'Needs a persistence layer',
    detail:
      'GET /api/webhooks returns MOCK_WEBHOOKS and POST does not store the ' +
      'endpoint. A webhook that is not recorded is never delivered to, so ' +
      'creating one would be silently meaningless.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'settings.memoryEditor': {
    summary: 'Needs a persistence layer',
    detail:
      'GET /api/users/me/memory returns MOCK_MEMORY and PATCH mutates a copy ' +
      'that is discarded when the request ends. User.genMemory exists in ' +
      'packages/db/prisma but the web app has no database connection.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'settings.logoUpload': {
    summary: 'Needs object storage',
    detail:
      'POST /api/upload/presign returns a fabricated URL under https://s3.mock/ ' +
      'instead of a signed S3 or R2 URL. An upload would post to a host that ' +
      'does not exist.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  /* -- content ------------------------------------------------------------- */

  'assets.upload': {
    summary: 'Needs object storage',
    detail:
      'POST /api/upload/presign returns a fabricated URL under https://s3.mock/, ' +
      'and the asset library itself is the hardcoded MOCK_ASSETS list. An ' +
      'uploaded file would have nowhere to go and nothing to appear in.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'assets.preview3d': {
    summary: 'No 3D viewer is built',
    detail:
      'Rendering a model in the browser needs a WebGL viewer that can load glTF ' +
      'or PLY. None is implemented here, and three.js is not a dependency of ' +
      'apps/web.',
    blocker: 'not-built',
  },

  'style.createPack': {
    summary: 'Needs a persistence layer',
    detail:
      'GET /api/styles returns MOCK_STYLE_PACKS. The StylePack model exists in ' +
      'packages/db/prisma, but nothing in the web app writes to it, so a new ' +
      'pack would not survive the request.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'projects.import': {
    summary: 'Needs a persistence layer',
    detail:
      'GET /api/projects serves MOCK_PROJECTS from src/lib/mockData. An ' +
      'imported project could be parsed but not saved, so it would vanish on ' +
      'the next request.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
  },

  'projects.createFromScript': {
    summary: 'Needs a persistence layer',
    detail:
      'Creating a project here would have to write through /api/projects, which ' +
      'serves the hardcoded MOCK_PROJECTS list and stores nothing.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
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
    summary: 'Needs object storage',
    detail:
      'Uploading a voice sample needs somewhere to put the audio. POST ' +
      '/api/upload/presign returns a fabricated URL under https://s3.mock/, and ' +
      'no voice-cloning provider is configured to train against it.',
    blocker: 'no-persistence',
    issue: NO_PERSISTENCE_ISSUE,
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
