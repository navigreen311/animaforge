'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Badge, { type BadgeStatus } from '@/components/shared/Badge';

interface Tab { id: string; label: string; }

const tabs: Tab[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'characters', label: 'Characters' },
  { id: 'shots', label: 'Shots' },
  { id: 'review', label: 'Review' },
  { id: 'assets', label: 'Assets' },
  { id: 'analytics', label: 'Analytics' },
];

interface ProjectData { title: string; status: BadgeStatus; description: string; }

const mockProject: ProjectData = {
  title: 'Cyber Samurai: Origin',
  status: 'generating',
  description: 'A cyberpunk short film following a ronin through neon-lit streets of Neo-Tokyo in 2087.',
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('timeline');
  const project = mockProject;

  const tabPlaceholders: Record<string, { icon: string; title: string; desc: string }> = {
    timeline: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Timeline View', desc: 'Drag and arrange your shots on the timeline.' },
    characters: { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Characters', desc: 'Manage characters and their visual identities for this project.' },
    shots: { icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', title: 'Shots', desc: 'Create and manage individual shots for your project.' },
    review: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Review', desc: 'Review and approve generated shots before final export.' },
    assets: { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Assets', desc: 'Manage images, audio, and other media assets.' },
    analytics: { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Analytics', desc: 'View generation stats, costs, and project metrics.' },
  };

  const current = tabPlaceholders[activeTab];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-100">{project.title}</h1>
          <Badge status={project.status} />
        </div>
        <p className="text-sm text-gray-400 max-w-2xl">{project.description}</p>
        <p className="text-xs text-gray-600 mt-1">Project ID: {params.id}</p>
      </div>

      <div className="border-b border-gray-800 mb-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {current && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={current.icon} />
            </svg>
            <h3 className="text-lg font-medium text-gray-300 mb-1">{current.title}</h3>
            <p className="text-sm text-gray-500">{current.desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
