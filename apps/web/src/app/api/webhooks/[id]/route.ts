import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json({
    message: `Webhook ${id} deleted`,
    deletedAt: new Date().toISOString(),
  });
}
