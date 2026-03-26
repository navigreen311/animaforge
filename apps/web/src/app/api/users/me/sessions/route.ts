import { NextResponse } from 'next/server';

const MOCK_SESSIONS = [
  {
    id: 'sess_01',
    device: 'MacBook Pro',
    browser: 'Chrome 124',
    ip: '192.168.1.42',
    location: 'Los Angeles, CA',
    lastActive: new Date().toISOString(),
    current: true,
    createdAt: '2026-03-25T08:00:00Z',
  },
  {
    id: 'sess_02',
    device: 'iPhone 16',
    browser: 'Safari 19',
    ip: '10.0.0.87',
    location: 'Los Angeles, CA',
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    current: false,
    createdAt: '2026-03-20T14:22:00Z',
  },
];

export async function GET() {
  return NextResponse.json({ sessions: MOCK_SESSIONS });
}
