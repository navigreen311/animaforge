import { NextRequest, NextResponse } from 'next/server';

const MOCK_NOTIFICATION_PREFS = {
  renderComplete: true,
  renderFailed: true,
  commentMention: true,
  teamInvite: true,
  weeklyDigest: false,
  marketplaceUpdates: false,
  billingAlerts: true,
  newFeatures: true,
  securityAlerts: true,
  usageLimitWarning: true,
};

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { preferences } = body as { preferences?: Record<string, boolean> };

  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json(
      { error: 'preferences object is required' },
      { status: 400 },
    );
  }

  const updatedPrefs = { ...MOCK_NOTIFICATION_PREFS };

  for (const [key, value] of Object.entries(preferences)) {
    if (key in updatedPrefs && typeof value === 'boolean') {
      (updatedPrefs as Record<string, boolean>)[key] = value;
    }
  }

  return NextResponse.json({
    preferences: updatedPrefs,
    updatedAt: new Date().toISOString(),
  });
}
