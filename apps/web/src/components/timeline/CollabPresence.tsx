'use client';

import type { Collaborator } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CollabPresenceProps {
  collaborators: Collaborator[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CollabPresence({ collaborators }: CollabPresenceProps) {
  return (
    <div className="absolute right-4 top-2 z-30 flex items-center gap-1.5">
      {collaborators.map((user) => (
        <div key={user.id} className="group relative">
          {/* Colored dot */}
          <div
            className="h-3 w-3 rounded-full ring-2 ring-zinc-950"
            style={{ backgroundColor: user.color }}
          />

          {/* Tooltip */}
          <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100">
            {user.name}
          </div>
        </div>
      ))}
    </div>
  );
}
