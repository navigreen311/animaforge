'use client';

import { useState } from 'react';
import { StyleCloner } from '@/components/style/StyleCloner';
import { CartoonConverter } from '@/components/style/CartoonConverter';
import { StyleLibrary } from '@/components/style/StyleLibrary';

type Tab = 'clone' | 'cartoon' | 'library';

const TABS: { key: Tab; label: string }[] = [
  { key: 'clone', label: 'Clone Style' },
  { key: 'cartoon', label: 'Image to Cartoon' },
  { key: 'library', label: 'Style Library' },
];

export default function StyleStudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('clone');

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Style Studio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Clone visual styles, convert images to cartoons, and browse the style library.
        </p>
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-1 rounded-lg bg-zinc-900 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'clone' && <StyleCloner />}
        {activeTab === 'cartoon' && <CartoonConverter />}
        {activeTab === 'library' && <StyleLibrary />}
      </div>
    </div>
  );
}
