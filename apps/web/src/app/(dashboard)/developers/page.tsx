'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */

type Section = 'getting-started' | 'authentication' | 'api-reference' | 'sdks' | 'webhooks' | 'sandbox' | 'changelog';

const NAV: { value: Section; label: string }[] = [
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'api-reference', label: 'API Reference' },
  { value: 'sdks', label: 'SDKs' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'changelog', label: 'Changelog' },
];

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
}

interface EndpointGroup {
  resource: string;
  endpoints: Endpoint[];
}

const API_GROUPS: EndpointGroup[] = [
  {
    resource: 'Projects',
    endpoints: [
      { method: 'GET', path: '/v1/projects', description: 'List all projects' },
      { method: 'POST', path: '/v1/projects', description: 'Create a new project' },
      { method: 'GET', path: '/v1/projects/:id', description: 'Get project details' },
      { method: 'PATCH', path: '/v1/projects/:id', description: 'Update project settings' },
      { method: 'DELETE', path: '/v1/projects/:id', description: 'Delete a project' },
    ],
  },
  {
    resource: 'Shots',
    endpoints: [
      { method: 'GET', path: '/v1/projects/:id/shots', description: 'List all shots in a project' },
      { method: 'POST', path: '/v1/projects/:id/shots', description: 'Create a new shot' },
      { method: 'POST', path: '/v1/shots/:id/generate', description: 'Trigger generation for a shot' },
      { method: 'GET', path: '/v1/shots/:id/status', description: 'Get generation status' },
      { method: 'DELETE', path: '/v1/shots/:id', description: 'Delete a shot' },
    ],
  },
  {
    resource: 'Assets',
    endpoints: [
      { method: 'GET', path: '/v1/assets', description: 'List all assets' },
      { method: 'POST', path: '/v1/assets/upload', description: 'Upload an asset' },
      { method: 'DELETE', path: '/v1/assets/:id', description: 'Delete an asset' },
    ],
  },
  {
    resource: 'Characters',
    endpoints: [
      { method: 'GET', path: '/v1/characters', description: 'List characters' },
      { method: 'POST', path: '/v1/characters', description: 'Create a character' },
      { method: 'PATCH', path: '/v1/characters/:id', description: 'Update character details' },
    ],
  },
  {
    resource: 'Export',
    endpoints: [
      { method: 'POST', path: '/v1/projects/:id/export', description: 'Start export job' },
      { method: 'GET', path: '/v1/exports/:id', description: 'Get export status' },
      { method: 'GET', path: '/v1/exports/:id/download', description: 'Download exported file' },
    ],
  },
];

const SDKS = [
  { name: 'JavaScript / TypeScript', lang: 'npm install @animaforge/sdk', icon: 'JS' },
  { name: 'Python', lang: 'pip install animaforge', icon: 'PY' },
  { name: 'Blender Plugin', lang: 'Download .zip — install via Preferences', icon: 'BL' },
  { name: 'Unreal Engine', lang: 'Download plugin from Marketplace', icon: 'UE' },
  { name: 'After Effects', lang: 'Download .zxp — install via ZXP Installer', icon: 'AE' },
];

const SANDBOX_ENDPOINTS = API_GROUPS.flatMap((g) => g.endpoints.map((e) => `${e.method} ${e.path}`));

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.4.0',
    date: '2026-04-01',
    changes: [
      'Added auto-assemble endpoint for AI-driven rough cut generation',
      'C2PA provenance metadata now included in all exports',
      'New repurpose API for multi-platform variant generation',
    ],
  },
  {
    version: 'v1.3.2',
    date: '2026-03-15',
    changes: [
      'Fixed race condition in parallel shot generation',
      'Improved webhook retry logic with exponential backoff',
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-03-01',
    changes: [
      'Brand kit enforcement API',
      'World Bible constraints endpoint',
      'Bulk shot approval/rejection',
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-02-10',
    changes: [
      'Character consistency API with reference image upload',
      'Export presets for YouTube, TikTok, Instagram, Twitter',
      'Review link generation and management',
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-01-15',
    changes: [
      'WebSocket support for real-time generation progress',
      'Python SDK initial release',
      'After Effects plugin beta',
    ],
  },
];

const QUICK_START = `import AnimaForge from '@animaforge/sdk';

const client = new AnimaForge({
  apiKey: process.env.ANIMAFORGE_API_KEY,
});

// Create a project
const project = await client.projects.create({
  name: 'My First Animation',
  type: 'short-film',
  aspectRatio: '16:9',
});

// Add a shot
const shot = await client.shots.create(project.id, {
  scene: 'EXT-01',
  prompt: 'A neon-lit alleyway in the rain, camera slowly dollying forward',
  duration: 4.0,
  style: 'cinematic-realism',
});

// Generate
const job = await client.shots.generate(shot.id);
console.log('Generation started:', job.id);

// Poll status
const status = await client.shots.status(shot.id);
console.log('Status:', status.state); // 'generating' | 'complete'`;

const AUTH_EXAMPLE = `# Include your API key in the Authorization header
curl -X GET https://api.animaforge.app/v1/projects \\
  -H "Authorization: Bearer af_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json"

# For sandbox/testing, use your test key:
# af_test_xxxxxxxxxxxxxxxxxxxx`;

const WEBHOOK_EXAMPLE = `// AnimaForge sends POST requests to your webhook URL
// with the following payload structure:

{
  "event": "shot.generation.complete",
  "timestamp": "2026-04-09T14:30:00Z",
  "data": {
    "shotId": "shot_abc123",
    "projectId": "proj_xyz789",
    "status": "complete",
    "outputUrl": "https://cdn.animaforge.app/renders/...",
    "duration": 4.2,
    "qualityScore": 94.5
  }
}

// Supported events:
// - shot.generation.started
// - shot.generation.complete
// - shot.generation.failed
// - export.complete
// - project.updated`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DeveloperPortalPage() {
  const [activeSection, setActiveSection] = useState<Section>('getting-started');

  // Sandbox state
  const [sandboxEndpoint, setSandboxEndpoint] = useState(SANDBOX_ENDPOINTS[0]);
  const [sandboxBody, setSandboxBody] = useState('{\n  "name": "Test Project",\n  "type": "short-film"\n}');
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const apiKeyMasked = 'af_live_••••••••••••••••xxf8';

  const runSandbox = () => {
    setSandboxLoading(true);
    setSandboxResponse(null);
    setTimeout(() => {
      setSandboxLoading(false);
      setSandboxResponse(JSON.stringify({
        status: 200,
        data: {
          id: 'proj_' + Math.random().toString(36).slice(2, 8),
          name: 'Test Project',
          type: 'short-film',
          createdAt: new Date().toISOString(),
          shots: [],
          status: 'active',
        },
      }, null, 2));
    }, 800);
  };

  /* shared styles */
  const card = 'rounded-xl border border-gray-800 bg-gray-900 p-5';
  const btnPrimary = 'rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors';
  const btnSecondary = 'rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 transition-colors';

  const methodColor: Record<string, string> = {
    GET: 'bg-green-600/20 text-green-400 border-green-800/30',
    POST: 'bg-blue-600/20 text-blue-400 border-blue-800/30',
    PATCH: 'bg-yellow-600/20 text-yellow-400 border-yellow-800/30',
    DELETE: 'bg-red-600/20 text-red-400 border-red-800/30',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Developer Portal</h1>
        <p className="text-xs text-gray-500 mt-0.5">API docs, SDKs, sandbox, and integration tools</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 flex-shrink-0">
          <div className="sticky top-4 space-y-1">
            {NAV.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setActiveSection(item.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === item.value
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-800/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ====================================================== */}
          {/*  Getting Started                                       */}
          {/* ====================================================== */}
          {activeSection === 'getting-started' && (
            <div className="space-y-5">
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-200 mb-2">Quick Start</h2>
                <p className="text-xs text-gray-500 mb-4">Install the SDK and create your first animation in under 5 minutes.</p>
                <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 overflow-x-auto">
                  <pre className="text-xs leading-relaxed"><code className="text-gray-300">{QUICK_START}</code></pre>
                </div>
              </div>
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-200 mb-2">Resources</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { title: 'API Reference', desc: 'Full endpoint documentation' },
                    { title: 'SDKs', desc: 'Official libraries for 5 platforms' },
                    { title: 'Sandbox', desc: 'Test API calls in your browser' },
                  ].map((r) => (
                    <button
                      key={r.title}
                      type="button"
                      onClick={() => setActiveSection(r.title.toLowerCase().replace(/ /g, '-') as Section)}
                      className="text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-200">{r.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/*  Authentication                                        */}
          {/* ====================================================== */}
          {activeSection === 'authentication' && (
            <div className="space-y-5">
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-200 mb-2">Authentication</h2>
                <p className="text-xs text-gray-500 mb-4">
                  All API requests require a Bearer token in the Authorization header. You can generate API keys from your account settings.
                </p>
                <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 overflow-x-auto">
                  <pre className="text-xs leading-relaxed"><code className="text-gray-300">{AUTH_EXAMPLE}</code></pre>
                </div>
              </div>
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-200 mb-3">Rate Limits</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left pb-2 text-gray-500 font-medium">Plan</th>
                        <th className="text-left pb-2 text-gray-500 font-medium">Requests / min</th>
                        <th className="text-left pb-2 text-gray-500 font-medium">Generations / day</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr className="border-b border-gray-800/50"><td className="py-2">Free</td><td className="py-2">60</td><td className="py-2">10</td></tr>
                      <tr className="border-b border-gray-800/50"><td className="py-2">Pro</td><td className="py-2">300</td><td className="py-2">200</td></tr>
                      <tr><td className="py-2">Enterprise</td><td className="py-2">1,000</td><td className="py-2">Unlimited</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/*  API Reference                                         */}
          {/* ====================================================== */}
          {activeSection === 'api-reference' && (
            <div className="space-y-5">
              {API_GROUPS.map((group) => (
                <div key={group.resource} className={card}>
                  <h2 className="text-sm font-semibold text-gray-200 mb-4">{group.resource}</h2>
                  <div className="space-y-2">
                    {group.endpoints.map((ep, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${methodColor[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="text-xs text-gray-300 font-mono flex-1">{ep.path}</code>
                        <span className="text-[11px] text-gray-500 hidden sm:inline">{ep.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ====================================================== */}
          {/*  SDKs                                                   */}
          {/* ====================================================== */}
          {activeSection === 'sdks' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SDKS.map((sdk) => (
                <div key={sdk.name} className={card}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-600/20 border border-violet-800/30 flex items-center justify-center text-xs font-bold text-violet-300">
                      {sdk.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-200">{sdk.name}</h3>
                  </div>
                  <code className="block text-[11px] text-gray-500 font-mono mb-4 bg-gray-800 rounded-lg px-3 py-2">{sdk.lang}</code>
                  <button type="button" className={btnSecondary + ' w-full'}>Download / Install</button>
                </div>
              ))}
            </div>
          )}

          {/* ====================================================== */}
          {/*  Webhooks                                               */}
          {/* ====================================================== */}
          {activeSection === 'webhooks' && (
            <div className="space-y-5">
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-200 mb-2">Webhooks</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Receive real-time notifications when events occur in your account. Configure webhook URLs in your account settings.
                </p>
                <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 overflow-x-auto">
                  <pre className="text-xs leading-relaxed"><code className="text-gray-300">{WEBHOOK_EXAMPLE}</code></pre>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/*  Sandbox                                                */}
          {/* ====================================================== */}
          {activeSection === 'sandbox' && (
            <div className="space-y-5">
              <div className={card}>
                <h2 className="text-sm font-semibold text-gray-200 mb-4">API Sandbox</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Endpoint</label>
                    <select
                      value={sandboxEndpoint}
                      onChange={(e) => setSandboxEndpoint(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 font-mono focus:border-violet-500 focus:outline-none"
                    >
                      {SANDBOX_ENDPOINTS.map((ep) => (
                        <option key={ep} value={ep}>{ep}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={apiKeyMasked}
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-500 font-mono focus:outline-none"
                      />
                      <button type="button" className={btnSecondary}>Reveal</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Request Body (JSON)</label>
                    <textarea
                      rows={8}
                      value={sandboxBody}
                      onChange={(e) => setSandboxBody(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-300 font-mono focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={runSandbox}
                    disabled={sandboxLoading}
                    className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {sandboxLoading ? 'Sending...' : 'Send'}
                  </button>

                  {sandboxResponse && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Response</label>
                      <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 overflow-x-auto">
                        <pre className="text-xs text-green-400 font-mono">{sandboxResponse}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/*  Changelog                                              */}
          {/* ====================================================== */}
          {activeSection === 'changelog' && (
            <div className="space-y-4">
              {CHANGELOG.map((entry) => (
                <div key={entry.version} className={card}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-600/20 text-violet-300 border border-violet-800/30">
                      {entry.version}
                    </span>
                    <span className="text-xs text-gray-500">{entry.date}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="w-1 h-1 rounded-full bg-gray-600 mt-1.5 flex-shrink-0" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
