import { NextResponse } from 'next/server';

const MOCK_USAGE = {
  totalCalls: 1247,
  byEndpoint: {
    generate: 890,
    characters: 240,
    export: 117,
  },
  rateLimit: {
    current: 84,
    max: 100,
    windowMs: 60000,
    resetsAt: new Date(Date.now() + 30000).toISOString(),
  },
  period: {
    start: '2026-03-01T00:00:00Z',
    end: '2026-03-31T23:59:59Z',
  },
};

export async function GET() {
  return NextResponse.json(MOCK_USAGE);
}
