'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer' | 'reviewer';
  avatar: string;
}

interface Character {
  id: string;
  name: string;
  description: string;
}

const mockProject = {
  name: 'Neon Odyssey',
  description: 'A cyberpunk short film exploring the boundary between human consciousness and AI sentience in a rain-soaked megacity.',
  type: 'short-film' as const,
  aspectRatio: '16:9' as const,
  duration: 180,
  thumbnail: null as string | null,
  brandKitId: 'bk-1',
};

const mockTeam: TeamMember[] = [
  { id: 't1', name: 'Alex Chen', email: 'alex@studio.io', role: 'owner', avatar: 'AC' },
  { id: 't2', name: 'Maya Patel', email: 'maya@studio.io', role: 'editor', avatar: 'MP' },
  { id: 't3', name: 'Jordan Lee', email: 'jordan@studio.io', role: 'reviewer', avatar: 'JL' },
  { id: 't4', name: 'Sam Rivera', email: 'sam@studio.io', role: 'viewer', avatar: 'SR' },
];

const mockCharacters: Character[] = [
  { id: 'c1', name: 'Kai', description: 'Rogue hacker with cybernetic left arm; wears a tattered grey hoodie' },
  { id: 'c2', name: 'Nova', description: 'AI entity manifesting as flickering holographic silhouette, blue-white glow' },
  { id: 'c3', name: 'Director Voss', description: 'Corporate antagonist, sharp suit, chrome eye implant' },
];

const mockBrandKits = [
  { id: 'bk-1', name: 'Neon Studio Default' },
  { id: 'bk-2', name: 'Client — Omnicorp' },
  { id: 'bk-3', name: 'Minimalist Mono' },
];

type Tab = 'general' | 'worldBible' | 'access' | 'brandKit' | 'danger';

const TABS: { value: Tab; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'worldBible', label: 'World Bible' },
  { value: 'access', label: 'Access' },
  { value: 'brandKit', label: 'Brand Kit' },
  { value: 'danger', label: 'Danger Zone' },
];

const PROJECT_TYPES = ['short-film', 'feature', 'commercial', 'music-video', 'social', 'custom'];
const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '2.39:1', '21:9'];
const ROLES: TeamMember['role'][] = ['owner', 'editor', 'reviewer', 'viewer'];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General
  const [name, setName] = useState(mockProject.name);
  const [description, setDescription] = useState(mockProject.description);
  const [projectType, setProjectType] = useState(mockProject.type);
  const [aspectRatio, setAspectRatio] = useState(mockProject.aspectRatio);
  const [duration, setDuration] = useState(mockProject.duration);

  // World Bible
  const [characters, setCharacters] = useState<Character[]>(mockCharacters);
  const [worldRules, setWorldRules] = useState('Rain never stops. Neon signage is in Japanese and English. Tech level: 2087. No magic — all abilities are cybernetic.');
  const [constraints, setConstraints] = useState<string[]>([
    'Kai always wears grey hoodie',
    'Nova never touches physical objects',
    'Night-only scenes — no daylight',
  ]);
  const [forbiddenDrift, setForbiddenDrift] = useState<string[]>([
    'No fantasy creatures',
    'No modern-day vehicles',
    'No bright pastel color palettes',
  ]);
  const [newConstraint, setNewConstraint] = useState('');
  const [newForbidden, setNewForbidden] = useState('');
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');

  // Access
  const [team, setTeam] = useState<TeamMember[]>(mockTeam);
  const [reviewLink, setReviewLink] = useState<string | null>(null);
  const [reviewExpiry, setReviewExpiry] = useState<string | null>(null);

  // Brand Kit
  const [selectedKit, setSelectedKit] = useState(mockProject.brandKitId);
  const [enforceColors, setEnforceColors] = useState(true);
  const [enforceTypography, setEnforceTypography] = useState(true);
  const [enforceLogo, setEnforceLogo] = useState(false);

  // Danger
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  /* helpers */
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const addConstraint = () => {
    if (!newConstraint.trim()) return;
    setConstraints((p) => [...p, newConstraint.trim()]);
    setNewConstraint('');
  };

  const addForbidden = () => {
    if (!newForbidden.trim()) return;
    setForbiddenDrift((p) => [...p, newForbidden.trim()]);
    setNewForbidden('');
  };

  const addCharacter = () => {
    if (!newCharName.trim()) return;
    setCharacters((p) => [...p, { id: `c${Date.now()}`, name: newCharName.trim(), description: newCharDesc.trim() }]);
    setNewCharName('');
    setNewCharDesc('');
  };

  const generateReviewLink = () => {
    setReviewLink(`https://animaforge.app/review/${params.id}/tk_${Math.random().toString(36).slice(2, 10)}`);
    setReviewExpiry('Expires in 7 days');
  };

  /* Shared styles */
  const card = 'rounded-xl border border-gray-800 bg-gray-900 p-5';
  const label = 'block text-xs font-medium text-gray-400 mb-1.5';
  const input = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none';
  const btnPrimary = 'rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-medium text-white transition-colors';
  const btnSecondary = 'rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 transition-colors';
  const btnDanger = 'rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-medium text-white transition-colors';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Project Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Project {params.id} &mdash; Configure project details, access, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-3">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === t.value
                ? t.value === 'danger'
                  ? 'bg-red-600/20 text-red-400'
                  : 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  GENERAL                                                     */}
      {/* ============================================================ */}
      {activeTab === 'general' && (
        <div className="max-w-2xl space-y-5">
          <div className={card}>
            <div className="space-y-4">
              <div>
                <label className={label}>Project Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </div>

              <div>
                <label className={label}>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${input} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Project Type</label>
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={input}>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Aspect Ratio</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={input}>
                    {ASPECT_RATIOS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Duration Target &mdash; {formatDuration(duration)}</label>
                <input
                  type="range"
                  min={15}
                  max={1800}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>15s</span>
                  <span>30min</span>
                </div>
              </div>

              <div>
                <label className={label}>Thumbnail</label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-14 rounded-lg border border-dashed border-gray-700 bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                    No image
                  </div>
                  <button type="button" className={btnSecondary}>Upload</button>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className={btnPrimary}>Save Changes</button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  WORLD BIBLE                                                 */}
      {/* ============================================================ */}
      {activeTab === 'worldBible' && (
        <div className="max-w-3xl space-y-5">
          {/* Characters */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Characters</h2>
            <div className="space-y-3 mb-4">
              {characters.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCharacters((p) => p.filter((x) => x.id !== c.id))}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Name" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} className={`${input} flex-shrink-0 w-32`} />
              <input type="text" placeholder="Description" value={newCharDesc} onChange={(e) => setNewCharDesc(e.target.value)} className={`${input} flex-1`} />
              <button type="button" onClick={addCharacter} className={btnSecondary}>+ Add</button>
            </div>
          </div>

          {/* World Rules */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">World Rules</h2>
            <textarea rows={4} value={worldRules} onChange={(e) => setWorldRules(e.target.value)} className={`${input} resize-none`} />
          </div>

          {/* Continuity Constraints */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Continuity Constraints</h2>
            <div className="space-y-2 mb-3">
              {constraints.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-800 text-sm text-gray-300">
                  <span>{c}</span>
                  <button type="button" onClick={() => setConstraints((p) => p.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Add constraint..." value={newConstraint} onChange={(e) => setNewConstraint(e.target.value)} className={`${input} flex-1`} onKeyDown={(e) => e.key === 'Enter' && addConstraint()} />
              <button type="button" onClick={addConstraint} className={btnSecondary}>+ Add</button>
            </div>
          </div>

          {/* Forbidden Drift */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Forbidden Drift Rules</h2>
            <div className="space-y-2 mb-3">
              {forbiddenDrift.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/30 text-sm text-red-300">
                  <span>{f}</span>
                  <button type="button" onClick={() => setForbiddenDrift((p) => p.filter((_, idx) => idx !== i))} className="text-red-600 hover:text-red-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Add forbidden rule..." value={newForbidden} onChange={(e) => setNewForbidden(e.target.value)} className={`${input} flex-1`} onKeyDown={(e) => e.key === 'Enter' && addForbidden()} />
              <button type="button" onClick={addForbidden} className={btnSecondary}>+ Add</button>
            </div>
          </div>

          <button type="button" className={btnPrimary}>Save World Bible</button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  ACCESS                                                      */}
      {/* ============================================================ */}
      {activeTab === 'access' && (
        <div className="max-w-3xl space-y-5">
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-200">Team Members</h2>
              <button type="button" className={btnSecondary}>+ Add Member</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="pb-2 text-xs font-medium text-gray-500">Member</th>
                    <th className="pb-2 text-xs font-medium text-gray-500">Email</th>
                    <th className="pb-2 text-xs font-medium text-gray-500">Role</th>
                    <th className="pb-2 text-xs font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m.id} className="border-b border-gray-800/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center text-[10px] font-bold text-violet-300">
                            {m.avatar}
                          </div>
                          <span className="text-gray-200">{m.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-500">{m.email}</td>
                      <td className="py-3">
                        <select
                          value={m.role}
                          onChange={(e) => setTeam((p) => p.map((x) => x.id === m.id ? { ...x, role: e.target.value as TeamMember['role'] } : x))}
                          className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:outline-none"
                          disabled={m.role === 'owner'}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        {m.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => setTeam((p) => p.filter((x) => x.id !== m.id))}
                            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Review link */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Review Link</h2>
            <p className="text-xs text-gray-500 mb-3">Generate a shareable link for external stakeholders to review the project.</p>
            {reviewLink ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={reviewLink} className={`${input} flex-1 text-xs`} />
                  <button type="button" onClick={() => navigator.clipboard?.writeText(reviewLink)} className={btnSecondary}>Copy</button>
                  <button type="button" onClick={() => { setReviewLink(null); setReviewExpiry(null); }} className="rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-800/30 px-3 py-2 text-xs font-medium text-red-400 transition-colors">Revoke</button>
                </div>
                <p className="text-[10px] text-gray-600">{reviewExpiry}</p>
              </div>
            ) : (
              <button type="button" onClick={generateReviewLink} className={btnPrimary}>Generate Review Link</button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  BRAND KIT                                                   */}
      {/* ============================================================ */}
      {activeTab === 'brandKit' && (
        <div className="max-w-2xl space-y-5">
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Applied Brand Kit</h2>
            <div className="space-y-4">
              <div>
                <label className={label}>Select Brand Kit</label>
                <select value={selectedKit} onChange={(e) => setSelectedKit(e.target.value)} className={input}>
                  {mockBrandKits.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{mockBrandKits.find((k) => k.id === selectedKit)?.name}</p>
                  <p className="text-[10px] text-gray-500">Currently applied</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-gray-400">Enforcement Toggles</h3>
                {[
                  { label: 'Enforce brand colors', value: enforceColors, set: setEnforceColors },
                  { label: 'Enforce typography', value: enforceTypography, set: setEnforceTypography },
                  { label: 'Enforce logo placement', value: enforceLogo, set: setEnforceLogo },
                ].map((toggle) => (
                  <label key={toggle.label} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">{toggle.label}</span>
                    <button
                      type="button"
                      onClick={() => toggle.set(!toggle.value)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${toggle.value ? 'bg-violet-600' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${toggle.value ? 'translate-x-4' : ''}`} />
                    </button>
                  </label>
                ))}
              </div>

              <button type="button" onClick={() => setSelectedKit('')} className="rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-800/30 px-4 py-2 text-xs font-medium text-red-400 transition-colors">
                Remove Brand Kit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  DANGER ZONE                                                 */}
      {/* ============================================================ */}
      {activeTab === 'danger' && (
        <div className="max-w-2xl space-y-5">
          {/* Archive */}
          <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-5">
            <h2 className="text-sm font-semibold text-red-300 mb-2">Archive Project</h2>
            <p className="text-xs text-gray-500 mb-4">
              Archiving hides this project from all dashboards. It can be restored later.
            </p>
            {archiveConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-400">Are you sure?</span>
                <button type="button" className={btnDanger}>Yes, Archive</button>
                <button type="button" onClick={() => setArchiveConfirm(false)} className={btnSecondary}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setArchiveConfirm(true)} className={btnDanger}>Archive Project</button>
            )}
          </div>

          {/* Delete */}
          <div className="rounded-xl border border-red-800/40 bg-red-900/10 p-5">
            <h2 className="text-sm font-semibold text-red-300 mb-2">Delete Project</h2>
            <p className="text-xs text-gray-500 mb-1">
              This action is permanent and cannot be undone.
            </p>
            <p className="text-xs text-red-400/70 mb-4">
              This will delete 8 shots, 24 assets, and all associated generation history.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Type <span className="font-mono text-red-400">{mockProject.name}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={mockProject.name}
                  className={`${input} border-red-800/50 focus:border-red-500`}
                />
              </div>
              <button
                type="button"
                disabled={deleteInput !== mockProject.name}
                className={`${btnDanger} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Permanently Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
