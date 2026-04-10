import { NextResponse } from 'next/server';
import { REGIONS } from '@/lib/region/regions';

export async function GET() {
  return NextResponse.json({ regions: REGIONS });
}
