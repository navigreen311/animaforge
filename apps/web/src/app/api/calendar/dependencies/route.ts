import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    dependencies: [
      {
        id: 'dep_1',
        fromTaskId: 'evt_1',
        toTaskId: 'evt_2',
        type: 'blocks',
        createdAt: new Date(Date.now() - 86400_000).toISOString(),
      },
      {
        id: 'dep_2',
        fromTaskId: 'evt_2',
        toTaskId: 'evt_3',
        type: 'blocks',
        createdAt: new Date(Date.now() - 43200_000).toISOString(),
      },
    ],
  });
}
