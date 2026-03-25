'use client';

import type { Shot } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ShotInspectorProps {
  shot: Shot | null;
  onEdit: () => void;
  onGenerate: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface FieldRowProps {
  label: string;
  value: string;
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200">{value || '—'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ShotInspector({ shot, onEdit, onGenerate }: ShotInspectorProps) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h3 className="text-sm font-semibold text-zinc-100">Inspector</h3>
        {shot && (
          <button
            onClick={onEdit}
            className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
          >
            Edit
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {!shot ? (
          <p className="text-xs text-zinc-500">Select a shot to inspect.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Shot number + status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-100">
                Shot #{shot.number}
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] capitalize text-zinc-400">
                {shot.status}
              </span>
            </div>

            {/* Fields (read-only) */}
            <FieldRow label="Subject" value={shot.subject} />
            <FieldRow label="Camera" value={shot.camera} />
            <FieldRow label="Action" value={shot.action} />
            <FieldRow label="Emotion" value={shot.emotion} />
            <FieldRow label="Timing" value={shot.timing} />
            <FieldRow label="Dialogue" value={shot.dialogue} />

            {/* Character refs */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Character Refs
              </span>
              <div className="flex flex-wrap gap-1">
                {shot.characterRefs.length > 0 ? (
                  shot.characterRefs.map((ref) => (
                    <span
                      key={ref}
                      className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
                    >
                      {ref}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">None</span>
                )}
              </div>
            </div>

            {/* Style ref */}
            <FieldRow label="Style Ref" value={shot.styleRef} />

            {/* Generate */}
            <button
              onClick={onGenerate}
              className="mt-2 w-full rounded bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Generate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
