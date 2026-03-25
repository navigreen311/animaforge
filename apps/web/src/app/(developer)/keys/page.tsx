'use client';

import { useState } from 'react';
import ApiKeyCard from '@/components/developer/ApiKeyCard';
import Modal from '@/components/shared/Modal';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  created: string;
  expires: string;
}

const availableScopes = [
  { id: 'projects:read', label: 'Projects (Read)' },
  { id: 'projects:write', label: 'Projects (Write)' },
  { id: 'shots:read', label: 'Shots (Read)' },
  { id: 'shots:write', label: 'Shots (Write)' },
  { id: 'characters:read', label: 'Characters (Read)' },
  { id: 'characters:write', label: 'Characters (Write)' },
  { id: 'generate', label: 'Generation' },
  { id: 'governance', label: 'Governance' },
];

const mockKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production Key',
    key: 'af_sk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    scopes: ['projects:read', 'projects:write', 'generate'],
    created: 'Mar 1, 2026',
    expires: 'Mar 1, 2027',
  },
  {
    id: '2',
    name: 'CI/CD Pipeline',
    key: 'af_sk_ci_x9y8w7v6u5t4s3r2q1p0o9n8m7l6k5j4',
    scopes: ['projects:read', 'shots:read', 'governance'],
    created: 'Feb 15, 2026',
    expires: 'Aug 15, 2026',
  },
  {
    id: '3',
    name: 'Development',
    key: 'af_sk_dev_z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5',
    scopes: ['projects:read', 'projects:write', 'shots:read', 'shots:write', 'characters:read', 'characters:write', 'generate', 'governance'],
    created: 'Jan 10, 2026',
    expires: 'Jan 10, 2027',
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(mockKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiration, setNewKeyExpiration] = useState('90');

  const handleCreateKey = () => {
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: newKeyName || 'Untitled Key',
      key: `af_sk_${newKeyName.toLowerCase().replace(/\s+/g, '_')}_${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`,
      scopes: newKeyScopes,
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      expires: new Date(Date.now() + parseInt(newKeyExpiration) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setKeys([newKey, ...keys]);
    setNewKeyName('');
    setNewKeyScopes([]);
    setNewKeyExpiration('90');
    setIsCreateOpen(false);
  };

  const handleRevoke = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your API keys and access scopes.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create API Key
        </button>
      </div>

      {/* Keys Table */}
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/80 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Scopes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <ApiKeyCard
                  key={key.id}
                  name={key.name}
                  keyValue={key.key}
                  scopes={key.scopes}
                  created={key.created}
                  expires={key.expires}
                  onRevoke={() => handleRevoke(key.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {keys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-1">No API keys</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">Create your first API key to start integrating with AnimaForge.</p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create First Key
            </button>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create API Key">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateKey();
          }}
        >
          <div>
            <label htmlFor="key-name" className="block text-sm font-medium text-gray-300 mb-1.5">
              Key Name
            </label>
            <input
              id="key-name"
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production, Staging..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scopes</label>
            <div className="grid grid-cols-2 gap-2">
              {availableScopes.map((scope) => (
                <label
                  key={scope.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    newKeyScopes.includes(scope.id)
                      ? 'bg-violet-900/30 border-violet-600 text-violet-300'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newKeyScopes.includes(scope.id)}
                    onChange={() => toggleScope(scope.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      newKeyScopes.includes(scope.id)
                        ? 'bg-violet-600 border-violet-500'
                        : 'border-gray-600'
                    }`}
                  >
                    {newKeyScopes.includes(scope.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="key-expiration" className="block text-sm font-medium text-gray-300 mb-1.5">
              Expiration
            </label>
            <select
              id="key-expiration"
              value={newKeyExpiration}
              onChange={(e) => setNewKeyExpiration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create Key
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
