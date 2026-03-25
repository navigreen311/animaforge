'use client';

import { useState } from 'react';

interface ScriptLine {
  type: 'character' | 'dialogue' | 'action' | 'direction';
  text: string;
}

interface ScriptOutputProps {
  lines: ScriptLine[];
  onRegenerate: () => void;
  isGenerating: boolean;
}

export function ScriptOutput({ lines, onRegenerate, isGenerating }: ScriptOutputProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = lines.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-700 p-8">
        <p className="text-sm text-zinc-600">
          Generated script will appear here...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Generated Script
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="rounded-lg border border-violet-600 bg-violet-600/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition hover:bg-violet-600/20 disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Script Lines */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <div className="max-h-[480px] overflow-y-auto">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="flex border-b border-zinc-800/50 last:border-b-0"
            >
              {/* Line Number */}
              <span className="flex w-10 shrink-0 items-start justify-end pr-3 pt-2 text-xs text-zinc-600 select-none">
                {idx + 1}
              </span>

              {/* Content */}
              <div className="flex-1 px-3 py-2">
                {line.type === 'character' && (
                  <span className="text-sm font-bold uppercase tracking-wide text-violet-400">
                    {line.text}
                  </span>
                )}
                {line.type === 'dialogue' && (
                  <span className="text-sm text-zinc-200">{line.text}</span>
                )}
                {line.type === 'action' && (
                  <span className="text-sm italic text-zinc-500">
                    {line.text}
                  </span>
                )}
                {line.type === 'direction' && (
                  <span className="text-sm font-medium uppercase text-amber-400/80">
                    {line.text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
