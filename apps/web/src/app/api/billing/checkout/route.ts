import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { credits } = body as { credits?: number };

  if (!credits || credits <= 0) {
    return NextResponse.json(
      { error: 'A positive credits amount is required' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    checkoutUrl: '/mock-stripe-checkout',
    credits,
    estimatedPrice: Math.round(credits * 0.005 * 100) / 100,
    currency: 'USD',
  });
}
