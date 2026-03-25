'use client';

import { useState } from 'react';
import EndpointDoc from '@/components/developer/EndpointDoc';

interface EndpointGroup {
  name: string;
  endpoints: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description: string;
    requestExample?: string;
    responseExample: string;
  }[];
}

const endpointGroups: EndpointGroup[] = [
  {
    name: 'Projects',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/projects',
        description: 'List all projects for the authenticated user.',
        responseExample: JSON.stringify({
          data: [
            { id: 'proj_abc123', title: 'Cyber Samurai', description: 'A cyberpunk short film', phase: 'generating', shot_count: 24, created_at: '2026-03-01T10:00:00Z' },
          ],
          meta: { total: 1, page: 1, per_page: 20 },
        }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/v1/projects',
        description: 'Create a new animation project.',
        requestExample: JSON.stringify({ title: 'My New Project', description: 'A stunning animation about...' }, null, 2),
        responseExample: JSON.stringify({ id: 'proj_def456', title: 'My New Project', description: 'A stunning animation about...', phase: 'draft', shot_count: 0, created_at: '2026-03-25T08:00:00Z' }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/v1/projects/:id',
        description: 'Retrieve a single project by ID.',
        responseExample: JSON.stringify({ id: 'proj_abc123', title: 'Cyber Samurai', description: 'A cyberpunk short film', phase: 'generating', shot_count: 24, created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-25T07:30:00Z' }, null, 2),
      },
      {
        method: 'PATCH',
        path: '/api/v1/projects/:id',
        description: 'Update project metadata.',
        requestExample: JSON.stringify({ title: 'Updated Title', description: 'Updated description' }, null, 2),
        responseExample: JSON.stringify({ id: 'proj_abc123', title: 'Updated Title', description: 'Updated description', phase: 'generating', updated_at: '2026-03-25T08:15:00Z' }, null, 2),
      },
      {
        method: 'DELETE',
        path: '/api/v1/projects/:id',
        description: 'Delete a project and all associated shots.',
        responseExample: JSON.stringify({ message: 'Project deleted successfully.' }, null, 2),
      },
    ],
  },
  {
    name: 'Shots',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/projects/:id/shots',
        description: 'List all shots in a project.',
        responseExample: JSON.stringify({
          data: [
            { id: 'shot_001', project_id: 'proj_abc123', order: 1, prompt: 'Wide establishing shot of neon city', duration_ms: 4000, status: 'completed' },
          ],
          meta: { total: 1 },
        }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/v1/projects/:id/shots',
        description: 'Add a new shot to the project timeline.',
        requestExample: JSON.stringify({ prompt: 'Close-up of samurai drawing sword', duration_ms: 3000, order: 2, style_preset: 'cinematic' }, null, 2),
        responseExample: JSON.stringify({ id: 'shot_002', project_id: 'proj_abc123', order: 2, prompt: 'Close-up of samurai drawing sword', duration_ms: 3000, status: 'pending', created_at: '2026-03-25T08:20:00Z' }, null, 2),
      },
      {
        method: 'PUT',
        path: '/api/v1/projects/:id/shots/:shotId',
        description: 'Update shot parameters.',
        requestExample: JSON.stringify({ prompt: 'Updated shot prompt', duration_ms: 5000 }, null, 2),
        responseExample: JSON.stringify({ id: 'shot_002', prompt: 'Updated shot prompt', duration_ms: 5000, status: 'pending', updated_at: '2026-03-25T08:25:00Z' }, null, 2),
      },
    ],
  },
  {
    name: 'Characters',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/characters',
        description: 'List all characters in your library.',
        responseExample: JSON.stringify({
          data: [
            { id: 'char_001', name: 'Kira', type: 'humanoid', style: 'anime', reference_images: 3, consent_status: 'approved' },
          ],
          meta: { total: 1 },
        }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/v1/characters',
        description: 'Create a new character entry with reference data.',
        requestExample: JSON.stringify({ name: 'New Character', type: 'humanoid', style: 'realistic', description: 'Tall figure with silver hair...' }, null, 2),
        responseExample: JSON.stringify({ id: 'char_002', name: 'New Character', type: 'humanoid', style: 'realistic', reference_images: 0, consent_status: 'pending', created_at: '2026-03-25T08:30:00Z' }, null, 2),
      },
    ],
  },
  {
    name: 'Generation',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/generate',
        description: 'Submit a generation job for one or more shots.',
        requestExample: JSON.stringify({ project_id: 'proj_abc123', shot_ids: ['shot_001', 'shot_002'], quality: 'high', model: 'animaforge-v2', c2pa_enabled: true }, null, 2),
        responseExample: JSON.stringify({ job_id: 'job_xyz789', status: 'queued', estimated_duration_s: 120, created_at: '2026-03-25T08:35:00Z' }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/v1/generate/:jobId/status',
        description: 'Check the status of a generation job.',
        responseExample: JSON.stringify({ job_id: 'job_xyz789', status: 'processing', progress: 0.45, current_shot: 'shot_001', estimated_remaining_s: 65 }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/v1/generate/:jobId/result',
        description: 'Retrieve completed generation outputs.',
        responseExample: JSON.stringify({ job_id: 'job_xyz789', status: 'completed', outputs: [{ shot_id: 'shot_001', output_url: 'https://cdn.animaforge.ai/outputs/shot_001.mp4', c2pa_manifest_url: 'https://cdn.animaforge.ai/manifests/shot_001.json', verification_url: 'https://animaforge.ai/verify/out_abc123' }] }, null, 2),
      },
    ],
  },
  {
    name: 'Governance',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/governance/verify',
        description: 'Verify the provenance and authenticity of generated content.',
        requestExample: JSON.stringify({ output_id: 'out_abc123' }, null, 2),
        responseExample: JSON.stringify({ output_id: 'out_abc123', verified: true, c2pa_valid: true, watermark_detected: true, generator: 'animaforge-v2', created_at: '2026-03-25T08:35:00Z', consent_status: 'all_approved' }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/v1/governance/consent/:characterId',
        description: 'Check likeness consent status for a character.',
        responseExample: JSON.stringify({ character_id: 'char_001', name: 'Kira', consent_status: 'approved', consent_granted_at: '2026-02-15T14:00:00Z', consent_type: 'perpetual', restrictions: [] }, null, 2),
      },
    ],
  },
];

export default function ApiDocsPage() {
  const [activeGroup, setActiveGroup] = useState(endpointGroups[0].name);

  const currentGroup = endpointGroups.find((g) => g.name === activeGroup) ?? endpointGroups[0];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">API Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete reference for the AnimaForge REST API. Base URL:{' '}
          <code className="text-violet-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">https://api.animaforge.ai/v1</code>
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0">
          <div className="sticky top-6 space-y-1">
            {endpointGroups.map((group) => (
              <button
                key={group.name}
                type="button"
                onClick={() => setActiveGroup(group.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeGroup === group.name
                    ? 'bg-violet-900/30 text-violet-300 border border-violet-700/50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                {group.name}
                <span className="ml-2 text-xs text-gray-600">{group.endpoints.length}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Endpoint List */}
        <div className="flex-1 space-y-3">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">{currentGroup.name}</h2>
          {currentGroup.endpoints.map((ep) => (
            <EndpointDoc
              key={`${ep.method}-${ep.path}`}
              method={ep.method}
              path={ep.path}
              description={ep.description}
              requestExample={ep.requestExample}
              responseExample={ep.responseExample}
              tryItOut
            />
          ))}
        </div>
      </div>
    </div>
  );
}
