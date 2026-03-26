import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  return NextResponse.json({
    success: true,
    webhookId: id,
    deliveredAt: new Date().toISOString(),
    responseStatus: 200,
    responseTime: 142,
  });
}
