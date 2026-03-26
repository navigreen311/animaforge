import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// GET /api/assets/storage-stats
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    total: 10_737_418_240,       // 10 GB
    used: 2_576_980_378,         // ~2.4 GB
    breakdown: {
      images: 858_993_459,       // ~820 MB
      videos: 1_288_490_189,     // ~1.2 GB
      audio: 214_748_365,        // ~205 MB
      models: 214_748_365,       // ~205 MB
    },
    archiveCandidates: 18,
    archiveSize: 4_509_715_660,  // ~4.2 GB
  });
}
