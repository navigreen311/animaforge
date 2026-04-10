import { NextResponse } from 'next/server';

const MOCK_DOMAINS = [
  { id: 'cd_001', domain: 'reviews.acmecorp.com', status: 'verified', cnameTarget: 'review.animaforge.com', sslStatus: 'issued', verifiedAt: '2026-04-01T00:00:00Z', createdAt: '2026-03-30T00:00:00Z' },
  { id: 'cd_002', domain: 'preview.studio.io', status: 'pending', cnameTarget: 'review.animaforge.com', sslStatus: 'pending', verifiedAt: null, createdAt: '2026-04-08T00:00:00Z' },
];

export async function GET() {
  return NextResponse.json({ domains: MOCK_DOMAINS });
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = `cd_${Date.now()}`;
  return NextResponse.json({
    id,
    domain: body.domain,
    status: 'pending',
    cnameTarget: 'review.animaforge.com',
    verificationToken: `verify_${Math.random().toString(36).slice(2, 10)}`,
    sslStatus: 'pending',
    createdAt: new Date().toISOString(),
  }, { status: 201 });
}
