import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    apiVersion: '1.0.0',
    status: 'stable',
    description: 'AnimaForge API v1 — stable production endpoints',
    documentation: '/api/docs',
    interactiveExplorer: '/developers',
    endpoints: {
      projects: 'GET/POST /api/v1/projects',
      shots: 'GET/PATCH /api/v1/shots/{id}',
      generate: 'POST /api/v1/shots/{id}/generate',
      characters: 'GET/POST /api/v1/characters',
      assets: 'GET /api/v1/assets',
      jobs: 'GET /api/v1/jobs/{id}',
      audio: 'POST /api/v1/audio/{music|voice|sfx}',
      styles: 'POST /api/v1/styles/clone',
      marketplace: 'GET /api/v1/marketplace/items',
      health: 'GET /api/v1/health',
    },
    rateLimit: {
      authenticated: '100 req/min',
      anonymous: '10 req/min',
      headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    },
    deprecation: { policy: '12 months notice for breaking changes' },
  });
}
