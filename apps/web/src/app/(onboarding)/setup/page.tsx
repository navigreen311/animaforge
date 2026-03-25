'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const styles = ['Realistic', 'Anime', 'Cartoon', 'Cinematic'] as const;
const ratios = ['16:9', '9:16', '1:1'] as const;

export default function SetupPage() {
  const [projectName, setProjectName] = useState('');
  const [style, setStyle] = useState<string>('Realistic');
  const [ratio, setRatio] = useState<string>('16:9');
  const router = useRouter();

  return (
    <div className="w-full">
      <h1 className="mb-2 text-center text-3xl font-bold">
        Create Your First Project
      </h1>
      <p className="mb-10 text-center text-zinc-400">
        Set up your workspace and creative preferences.
      </p>

      {/* Project Name */}
      <div className="mb-8">
        <label
          htmlFor="project-name"
          className="mb-2 block text-sm font-medium text-zinc-300"
        >
          Project Name
        </label>
        <input
          id="project-name"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="My First Animation"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-white placeholder-zinc-600 outline-none transition-colors focus:border-violet-500"
        />
      </div>

      {/* Style Preference */}
      <div className="mb-8">
        <label className="mb-3 block text-sm font-medium text-zinc-300">
          Style Preference
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {styles.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                style === s
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="mb-10">
        <label className="mb-3 block text-sm font-medium text-zinc-300">
          Aspect Ratio
        </label>
        <div className="flex gap-3">
          {ratios.map((r) => (
            <button
              key={r}
              onClick={() => setRatio(r)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                ratio === r
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          disabled={!projectName.trim()}
          onClick={() => router.push('/onboarding/tour')}
          className="rounded-lg bg-violet-600 px-8 py-3 font-medium transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
