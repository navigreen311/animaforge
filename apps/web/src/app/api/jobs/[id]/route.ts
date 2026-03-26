import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({
    success: true,
    message: 'Job cancelled',
    jobId: params.id,
  });
}
