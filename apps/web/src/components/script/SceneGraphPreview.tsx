'use client';

export interface SceneGraph {
  subject: string;
  cameraAngle: string;
  cameraMovement: string;
  action: string;
  emotion: string;
  timing: string;
  dialogue: string;
}

interface SceneGraphPreviewProps {
  graph: SceneGraph;
  onEdit: (graph: SceneGraph) => void;
}

const FIELDS: { key: keyof SceneGraph; label: string; color: string }[] = [
  { key: 'subject', label: 'Subject', color: 'text-violet-400' },
  { key: 'cameraAngle', label: 'Camera Angle', color: 'text-sky-400' },
  { key: 'cameraMovement', label: 'Camera Movement', color: 'text-sky-400' },
  { key: 'action', label: 'Action', color: 'text-emerald-400' },
  { key: 'emotion', label: 'Emotion', color: 'text-amber-400' },
  { key: 'timing', label: 'Timing', color: 'text-rose-400' },
  { key: 'dialogue', label: 'Dialogue', color: 'text-zinc-300' },
];

export function SceneGraphPreview({ graph, onEdit }: SceneGraphPreviewProps) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Scene Graph
        </h4>
        <button
          onClick={() => onEdit(graph)}
          className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-violet-500 hover:text-violet-300"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-0.5 rounded-lg bg-zinc-800/60 px-3 py-2"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {field.label}
            </span>
            <span className={`text-sm ${field.color}`}>
              {graph[field.key] || '---'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
