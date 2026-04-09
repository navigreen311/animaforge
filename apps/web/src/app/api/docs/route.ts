import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'AnimaForge API',
      version: '1.0.0',
      description: 'AI Animation & Video Production API',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
    paths: {
      '/projects': {
        get: {
          summary: 'List projects',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Project list' } },
        },
        post: {
          summary: 'Create project',
          tags: ['Projects'],
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Created' } },
        },
      },
      '/shots/{id}': {
        patch: {
          summary: 'Update shot',
          tags: ['Shots'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated' } },
        },
      },
      '/shots/{id}/generate': {
        post: {
          summary: 'Generate shot',
          tags: ['Shots'],
          responses: { '202': { description: 'Accepted' } },
        },
      },
      '/characters': {
        get: {
          summary: 'List characters',
          tags: ['Characters'],
          responses: { '200': { description: 'Character list' } },
        },
      },
      '/assets': {
        get: {
          summary: 'List assets',
          tags: ['Assets'],
          responses: { '200': { description: 'Asset list' } },
        },
      },
      '/jobs/{id}': {
        get: {
          summary: 'Get job status',
          tags: ['Jobs'],
          responses: { '200': { description: 'Job details' } },
        },
      },
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
