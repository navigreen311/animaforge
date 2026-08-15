import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  POST /api/analytics/connect                                       */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  let body: { platform?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body. Expected { "platform": "..." }.' },
      { status: 400 },
    );
  }

  const { platform } = body;

  if (!platform || typeof platform !== 'string') {
    return NextResponse.json({ error: 'Missing required field "platform".' }, { status: 400 });
  }

  const supported = ['YouTube', 'TikTok', 'Meta'];
  if (!supported.includes(platform)) {
    return NextResponse.json(
      {
        error: `Unsupported platform "${platform}". Supported: ${supported.join(', ')}.`,
      },
      { status: 400 },
    );
  }

  // No OAuth flow is started, and saying one was would be false. Connecting a
  // platform needs a registered OAuth application and secret per provider;
  // none is configured, so there is no authorisation URL to return.
  //
  // 501 rather than 200: the request was well formed and the route exists, but
  // the capability is not implemented. A 200 here would let the client believe
  // a connection was in progress and sit waiting for a callback that can never
  // arrive.
  const envVar = `${platform.toUpperCase()}_OAUTH_CLIENT_ID`;

  return NextResponse.json(
    {
      error: 'not_configured',
      message:
        `Connecting ${platform} requires a registered OAuth application. ` +
        `${envVar} and its client secret are not configured, so no ` +
        'authorisation URL can be generated.',
      platform,
      missingConfiguration: [envVar, `${platform.toUpperCase()}_OAUTH_CLIENT_SECRET`],
    },
    { status: 501 },
  );
}
