import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // In production, verify the Stripe signature header:
  // const sig = request.headers.get('stripe-signature');
  // const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

  const body = await request.json();

  // Stub: log the event type for debugging
  const eventType = body?.type ?? 'unknown';

  return NextResponse.json({
    received: true,
    eventType,
    processedAt: new Date().toISOString(),
  });
}
