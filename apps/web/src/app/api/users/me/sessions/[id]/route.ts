import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json({
    message: `Session ${id} revoked`,
    revokedAt: new Date().toISOString(),
  });
}
