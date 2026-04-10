import { NextResponse } from 'next/server';

const CHANGELOG = [
  {
    version: '1.0.0',
    releasedAt: '2026-04-09',
    status: 'stable',
    changes: [
      { type: 'added', description: 'Initial v1 stable release' },
      { type: 'added', description: 'All core endpoints (projects, shots, characters, assets, jobs)' },
      { type: 'added', description: 'Audio generation endpoints (music, voice, SFX)' },
      { type: 'added', description: 'Style cloning and apply endpoints' },
      { type: 'added', description: 'Marketplace browse and purchase' },
      { type: 'added', description: 'Rate limit headers on all responses' },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ versions: CHANGELOG });
}
