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
    return NextResponse.json(
      { error: 'Missing required field "platform".' },
      { status: 400 },
    );
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

  return NextResponse.json({
    message: 'OAuth flow initiated — coming soon',
    platform,
  });
}
