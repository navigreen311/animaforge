import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const notice = {
    id: `dmca_${Math.random().toString(36).slice(2, 10)}`,
    matchId: body.matchId ?? 'pm_unknown',
    userId: body.userId ?? 'user_1',
    status: 'filed',
    filedAt: new Date().toISOString(),
    caseNumber: `CASE-${Date.now()}`,
    responseAt: null,
    metadata: body.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json({ notice }, { status: 201 });
}
