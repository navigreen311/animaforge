import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    portalUrl: '/mock-stripe-portal',
  });
}
