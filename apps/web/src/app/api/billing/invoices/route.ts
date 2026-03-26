import { NextResponse } from 'next/server';

const MOCK_INVOICES = [
  {
    id: 'inv_2026_03',
    date: '2026-03-01',
    amount: 49,
    currency: 'USD',
    status: 'paid',
    description: 'AnimaForge Pro - March 2026',
    pdfUrl: '/mock-invoices/inv_2026_03.pdf',
  },
  {
    id: 'inv_2026_02',
    date: '2026-02-01',
    amount: 49,
    currency: 'USD',
    status: 'paid',
    description: 'AnimaForge Pro - February 2026',
    pdfUrl: '/mock-invoices/inv_2026_02.pdf',
  },
  {
    id: 'inv_2026_01',
    date: '2026-01-01',
    amount: 49,
    currency: 'USD',
    status: 'paid',
    description: 'AnimaForge Pro - January 2026',
    pdfUrl: '/mock-invoices/inv_2026_01.pdf',
  },
];

export async function GET() {
  return NextResponse.json({ invoices: MOCK_INVOICES });
}
