'use client';

import { Fragment, useState } from 'react';
import { SceneGraphPreview, type SceneGraph } from './SceneGraphPreview';

export interface Shot {
  id: string;
  number: number;
  description: string;
  duration: string;
  cameraAngle: string;
  cameraMovement: string;
  sceneGraph: SceneGraph;
}

interface ShotBreakdownProps {
  shots: Shot[];
  onSendToTimeline: (shotId: string) => void;
  onSendAllToTimeline: () => void;
  onEditSceneGraph: (shotId: string, graph: SceneGraph) => void;
}

export function ShotBreakdown({
  shots,
  onSendToTimeline,
  onSendAllToTimeline,
  onEditSceneGraph,
}: ShotBreakdownProps) {
  const [expandedShot, setExpandedShot] = useState<string | null>(null);

  if (shots.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-700 p-8">
        <p className="text-sm text-zinc-600">
          Shot breakdown will appear after script generation...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Shot Breakdown
        </h3>
        <button
          onClick={onSendAllToTimeline}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
        >
          Send All to Timeline
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-700">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/60">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Shot #
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Description
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Duration
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Camera Angle
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Movement
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {shots.map((shot) => {
              const isExpanded = expandedShot === shot.id;
              return (
                <Fragment key={shot.id}>
                  <tr
                    className="cursor-pointer bg-zinc-900 transition hover:bg-zinc-800/50"
                    onClick={() =>
                      setExpandedShot(isExpanded ? null : shot.id)
                    }
                  >
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {shot.number}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-300">
                      {shot.description}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{shot.duration}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {shot.cameraAngle}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {shot.cameraMovement}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendToTimeline(shot.id);
                        }}
                        className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-violet-500 hover:text-violet-300"
                      >
                        Send to Timeline
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-zinc-950 px-4 py-4">
                        <SceneGraphPreview
                          graph={shot.sceneGraph}
                          onEdit={(graph) => onEditSceneGraph(shot.id, graph)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

