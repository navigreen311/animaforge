import { NextRequest, NextResponse } from 'next/server';

const MOCK_API_KEYS = [
  {
    id: 'key_01',
    name: 'Production App',
    maskedKey: 'af_live_****...x8Kp',
    scopes: ['generate', 'characters', 'export'],
    createdAt: '2026-01-15T10:00:00Z',
    lastUsedAt: '2026-03-25T08:42:00Z',
    expiresAt: '2027-01-15T10:00:00Z',
  },
  {
    id: 'key_02',
    name: 'Staging Tests',
    maskedKey: 'af_test_****...m3Qr',
    scopes: ['generate', 'characters'],
    createdAt: '2026-02-20T14:30:00Z',
    lastUsedAt: '2026-03-24T16:10:00Z',
    expiresAt: '2026-08-20T14:30:00Z',
  },
];

export async function GET() {
  return NextResponse.json({ apiKeys: MOCK_API_KEYS });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, scopes, expiry } = body as {
    name?: string;
    scopes?: string[];
    expiry?: string;
  };

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'API key name is required' },
      { status: 400 },
    );
  }

  const now = new Date();
  const expiresAt = expiry
    ? new Date(expiry).toISOString()
    : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const newKey = {
    id: `key_${Date.now()}`,
    name: name.trim(),
    fullKey: `af_live_${crypto.randomUUID().replace(/-/g, '')}`,
    maskedKey: 'af_live_****...newly_created',
    scopes: scopes ?? ['generate'],
    createdAt: now.toISOString(),
    lastUsedAt: null,
    expiresAt,
  };

  return NextResponse.json(
    {
      apiKey: newKey,
      warning: 'Store this key securely. It will not be shown again.',
    },
    { status: 201 },
  );
}
