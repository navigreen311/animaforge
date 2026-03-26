import { NextRequest, NextResponse } from 'next/server';

const MOCK_WEBHOOKS = [
  {
    id: 'wh_01',
    url: 'https://example.com/webhooks/animaforge',
    events: ['render.complete', 'render.failed', 'export.ready'],
    secret: 'whsec_****...aB3z',
    active: true,
    createdAt: '2026-02-10T12:00:00Z',
    lastDeliveredAt: '2026-03-25T07:55:00Z',
  },
];

export async function GET() {
  return NextResponse.json({ webhooks: MOCK_WEBHOOKS });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, events, secret } = body as {
    url?: string;
    events?: string[];
    secret?: string;
  };

  if (!url || !url.startsWith('https://')) {
    return NextResponse.json(
      { error: 'A valid HTTPS URL is required' },
      { status: 400 },
    );
  }

  if (!events || events.length === 0) {
    return NextResponse.json(
      { error: 'At least one event type is required' },
      { status: 400 },
    );
  }

  const newWebhook = {
    id: `wh_${Date.now()}`,
    url,
    events,
    secret: secret ?? `whsec_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
    active: true,
    createdAt: new Date().toISOString(),
    lastDeliveredAt: null,
  };

  return NextResponse.json({ webhook: newWebhook }, { status: 201 });
}
