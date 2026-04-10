import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    success: true,
    message: 'Job retry queued',
    jobId: params.id,
    newJobId: `job_${Math.random().toString(36).slice(2, 10)}`,
    status: 'queued',
    queuedAt: new Date().toISOString(),
  });
}
