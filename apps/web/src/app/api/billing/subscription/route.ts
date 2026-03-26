import { NextResponse } from 'next/server';

const MOCK_SUBSCRIPTION = {
  plan: 'Pro',
  price: 49,
  currency: 'USD',
  interval: 'month',
  status: 'active',
  renewsAt: '2026-05-15',
  credits: {
    used: 4200,
    total: 10000,
    resetDate: '2026-04-15',
  },
  features: [
    '10,000 render credits/month',
    '4K export',
    'Priority queue',
    'Custom brand kits',
    'API access',
  ],
};

export async function GET() {
  return NextResponse.json(MOCK_SUBSCRIPTION);
}
