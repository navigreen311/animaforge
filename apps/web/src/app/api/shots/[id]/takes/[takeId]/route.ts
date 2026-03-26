import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; takeId: string } },
) {
  return NextResponse.json({
    success: true,
    shotId: params.id,
    takeId: params.takeId,
  });
}
