import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Export requested. Email sent shortly.',
    requestedAt: new Date().toISOString(),
    estimatedDelivery: '~15 minutes',
  });
}
