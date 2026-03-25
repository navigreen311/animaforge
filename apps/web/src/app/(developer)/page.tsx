'use client';

import { useState } from 'react';

const apiEndpoints = [
  { method: 'POST', path: '/api/v1/projects', description: 'Create a new animation project' },
  { method: 'GET', path: '/api/v1/projects/:id', description: 'Retrieve project details' },
  { method: 'POST', path: '/api/v1/projects/:id/shots', description: 'Add a shot to a project' },
  { method: 'POST', path: '/api/v1/generate', description: 'Submit a generation job' },
  { method: 'GET', path: '/api/v1/generate/:jobId/status', description: 'Check generation status' },
  { method: 'GET', path: '/api/v1/characters', description: 'List character library' },
  { method: 'POST', path: '/api/v1/governance/verify', description: 'Verify content provenance' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-900/50 text-green-300 border-green-700',
  POST: 'bg-blue-900/50 text-blue-300 border-blue-700',
  PUT: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  DELETE: 'bg-red-900/50 text-red-300 border-red-700',
};

export default function DeveloperPortalPage() {
  const [sandboxEnabled, setSandboxEnabled] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-100">AnimaForge Developer Platform</h1>
        <p className="text-gray-400 mt-2 text-lg">
          Build AI-powered animation workflows with our comprehensive API.
        </p>
      </div>

      {/* Sandbox Toggle */}
      <div className="flex items-center gap-3 mb-10 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <button
          type="button"
          onClick={() => setSandboxEnabled(!sandboxEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            sandboxEnabled ? 'bg-violet-600' : 'bg-gray-600'
          }`}
          role="switch"
          aria-checked={sandboxEnabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              sandboxEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <div>
          <span className="text-sm font-medium text-gray-200">
            Sandbox Mode {sandboxEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <p className="text-xs text-gray-500">
            {sandboxEnabled
              ? 'API calls routed to sandbox environment. No credits consumed.'
              : 'Toggle to test API calls without consuming credits.'}
          </p>
        </div>
        {sandboxEnabled && (
          <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700">
            SANDBOX
          </span>
        )}
      </div>

      {/* Quick Start Guide */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-violet-900/50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-200 mb-1">1. Create an API Key</h3>
            <p className="text-xs text-gray-500">
              Generate your API key from the{' '}
              <a href="/keys" className="text-violet-400 hover:text-violet-300 underline">
                Keys page
              </a>{' '}
              with the scopes you need.
            </p>
          </div>
          <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-violet-900/50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-200 mb-1">2. Make Your First Call</h3>
            <p className="text-xs text-gray-500">
              Use the API key in an <code className="text-violet-400">Authorization</code> header and create a project.
            </p>
          </div>
          <div className="p-5 bg-gray-800/50 border border-gray-700 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-violet-900/50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-200 mb-1">3. Generate Content</h3>
            <p className="text-xs text-gray-500">
              Submit generation jobs and poll for results. C2PA manifests are auto-attached.
            </p>
          </div>
        </div>
      </section>

      {/* Auth Example */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Authentication</h2>
        <div className="rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-gray-800/80 border-b border-gray-700">
            <span className="text-xs font-medium text-green-300">curl</span>
          </div>
          <pre className="p-4 bg-gray-950 overflow-x-auto text-sm leading-relaxed">
            <code className="text-green-300">{`curl -X GET https://api.animaforge.ai/v1/projects \\
  -H "Authorization: Bearer af_sk_your_api_key_here" \\
  -H "Content-Type: application/json"`}</code>
          </pre>
        </div>
      </section>

      {/* API Endpoint Reference */}
      <section>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">API Endpoint Reference</h2>
        <div className="space-y-2">
          {apiEndpoints.map((ep) => (
            <a
              key={`${ep.method}-${ep.path}`}
              href="/docs"
              className="flex items-center gap-3 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg hover:bg-gray-800/60 transition-colors"
            >
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${methodColors[ep.method]}`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono text-gray-300">{ep.path}</code>
              <span className="text-sm text-gray-500 ml-auto">{ep.description}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
