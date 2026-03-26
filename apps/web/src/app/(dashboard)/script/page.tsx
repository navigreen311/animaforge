'use client';

import { useState } from 'react';
import { Sparkles, FileText, Clock } from 'lucide-react';

/* ── Sample data ──────────────────────────────────────────── */

const SAMPLE_SCRIPTS = [
  {
    id: 1,
    heading: 'SCENE 1 - EXT. NEO-TOKYO ROOFTOP - NIGHT',
    description:
      'Kai stands on the edge of a rain-soaked rooftop, neon lights reflecting off his cybernetic arm. The city hums below — a maze of holographic billboards and speeding drones. He clenches his fist, circuits flickering beneath synthetic skin.',
  },
  {
    id: 2,
    heading: 'SCENE 2 - INT. UNDERGROUND LAB - NIGHT',
    description:
      'Dr. Echo adjusts holographic displays, her fingers dancing through projected data streams. Vials of luminescent fluid line the walls. A warning klaxon pulses red as anomalous readings spike across every monitor.',
  },
  {
    id: 3,
    heading: 'SCENE 3 - EXT. GARDEN RUINS - DAWN',
    description:
      'Luna kneels beside a withered flower, channeling energy from her palms. Golden light seeps into cracked earth. Petals unfurl in slow motion as the first rays of sunrise break through crumbling stone arches.',
  },
];

const SHOT_BREAKDOWN = [
  { shot: 1, description: 'Wide establishing — rooftop skyline', duration: '4s' },
  { shot: 2, description: 'Close-up — cybernetic arm flicker', duration: '2s' },
  { shot: 3, description: 'Medium — Kai clenching fist', duration: '3s' },
  { shot: 4, description: 'Wide — underground lab interior', duration: '4s' },
  { shot: 5, description: 'Insert — holographic data streams', duration: '2s' },
  { shot: 6, description: 'Medium — Dr. Echo at console', duration: '3s' },
  { shot: 7, description: 'Wide — garden ruins at dawn', duration: '5s' },
  { shot: 8, description: 'Close-up — energy flowing into flower', duration: '3s' },
  { shot: 9, description: 'Slow-mo — petals unfurling', duration: '4s' },
];

/* ── Page ─────────────────────────────────────────────────── */

export default function ScriptPage() {
  const [prompt, setPrompt] = useState('');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <FileText size={20} style={{ color: 'var(--brand-light)' }} />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Script AI
          </h1>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--brand-dim)',
              color: 'var(--brand-light)',
            }}
          >
            <Sparkles size={12} />
            Powered by Claude
          </span>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: Script editor ─────────────────────── */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          {/* Prompt input */}
          <div className="flex flex-col gap-3">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your scene..."
              className="w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-transparent"
              style={{
                height: 120,
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              className="flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              <Sparkles size={14} />
              Generate Script
            </button>
          </div>

          {/* Generated script output */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Generated Script
            </h2>

            <div className="flex flex-col gap-3">
              {SAMPLE_SCRIPTS.map((scene) => (
                <div
                  key={scene.id}
                  className="rounded-lg border p-4"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-brand)' }}
                  >
                    {scene.heading}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {scene.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel: Shot Breakdown ───────────────────── */}
        <aside
          className="flex w-[280px] shrink-0 flex-col border-l overflow-y-auto"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 border-b px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <Clock size={14} style={{ color: 'var(--brand-light)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Shot Breakdown
            </h3>
          </div>

          <div className="flex flex-col gap-1 p-3">
            {SHOT_BREAKDOWN.map((shot) => (
              <div
                key={shot.shot}
                className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: 'var(--brand-dim)',
                    color: 'var(--brand-light)',
                  }}
                >
                  {shot.shot}
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {shot.description}
                  </span>
                  <span className="mt-0.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {shot.duration}
                  </span>
                </div>
              </div>
            ))}

            {/* Total duration */}
            <div
              className="mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-xs"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Total estimated</span>
              <span className="font-semibold" style={{ color: 'var(--text-brand)' }}>
                30s
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
