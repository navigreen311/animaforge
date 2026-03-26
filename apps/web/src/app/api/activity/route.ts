import { NextResponse } from 'next/server';

import { MOCK_ACTIVITY } from '@/lib/mockData';

export async function GET() {
  const sortedActivities = [...MOCK_ACTIVITY]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 20);

  return NextResponse.json({
    activities: sortedActivities,
    total: sortedActivities.length,
  });
}
