'use client';

import type { StyleFingerprint } from '@/types';

/* ------------------------------------------------------------------ */
/*  Mock rich fingerprint data for visualization                       */
/* ------------------------------------------------------------------ */

interface RichFingerprint {
  colorPalette: { dominant: string; accents: string[] };
  contrastProfile: { shadows: number; highlights: number; gamma: number };
  lensCharacter: { focalLength: string; aberration: string; vignette: number };
  cameraMotionTags: string[];
  lineWeightRange: [number, number];
  fillStyle: string;
  shadingApproach: string;
  confidence: number;
}

function deriveRichData(_fp: StyleFingerprint): RichFingerprint {
  return {
    colorPalette: {
      dominant: '#6d28d9',
      accents: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6'],
    },
    contrastProfile: { shadows: 0.72, highlights: 0.85, gamma: 1.1 },
    lensCharacter: { focalLength: '35mm', aberration: 'Low', vignette: 0.15 },
    cameraMotionTags: ['Dolly-in', 'Pan-left', 'Static', 'Handheld'],
    lineWeightRange: [0.5, 3.0],
    fillStyle: 'Flat fill with soft gradients',
    shadingApproach: 'Cel-shading with ambient occlusion',
    confidence: 0.87,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface FingerprintViewerProps {
  fingerprint: StyleFingerprint;
}

export function FingerprintViewer({ fingerprint }: FingerprintViewerProps) {
  const data = deriveRichData(fingerprint);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Style Fingerprint &mdash; {fingerprint.name}
      </h3>

      {/* Color Palette */}
      <Section title="Color Palette">
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 rounded-md border border-zinc-700"
            style={{ backgroundColor: data.colorPalette.dominant }}
            title="Dominant"
          />
          {data.colorPalette.accents.map((c, i) => (
            <div
              key={i}
              className="h-8 w-8 rounded-md border border-zinc-700"
              style={{ backgroundColor: c }}
              title={`Accent ${i + 1}`}
            />
          ))}
        </div>
      </Section>

      {/* Contrast Profile */}
      <Section title="Contrast Profile">
        <div className="space-y-2">
          <Bar label="Shadows" value={data.contrastProfile.shadows} />
          <Bar label="Highlights" value={data.contrastProfile.highlights} />
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Gamma</span>
            <span className="font-mono text-zinc-200">{data.contrastProfile.gamma.toFixed(2)}</span>
          </div>
        </div>
      </Section>

      {/* Lens Character */}
      <Section title="Lens Character">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <Stat label="Focal Length" value={data.lensCharacter.focalLength} />
          <Stat label="Aberration" value={data.lensCharacter.aberration} />
          <Stat label="Vignette" value={`${(data.lensCharacter.vignette * 100).toFixed(0)}%`} />
        </div>
      </Section>

      {/* Camera Motion Tags */}
      <Section title="Camera Motion">
        <div className="flex flex-wrap gap-1.5">
          {data.cameraMotionTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </Section>

      {/* Line Weight */}
      <Section title="Line Weight Range">
        <div className="flex items-center gap-2 text-sm text-zinc-200">
          <span className="font-mono">{data.lineWeightRange[0]}px</span>
          <div className="h-px flex-1 bg-gradient-to-r from-zinc-600 to-zinc-400" />
          <span className="font-mono">{data.lineWeightRange[1]}px</span>
        </div>
      </Section>

      {/* Fill Style & Shading */}
      <div className="grid grid-cols-2 gap-4">
        <Section title="Fill Style">
          <p className="text-sm text-zinc-300">{data.fillStyle}</p>
        </Section>
        <Section title="Shading Approach">
          <p className="text-sm text-zinc-300">{data.shadingApproach}</p>
        </Section>
      </div>

      {/* Confidence */}
      <Section title="Confidence Score">
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all"
              style={{ width: `${data.confidence * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-zinc-200">
            {(data.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h4>
      {children}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-zinc-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-mono text-zinc-300">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-0.5 font-medium text-zinc-200">{value}</p>
    </div>
  );
}
