'use client';

import { useGenerationStore } from '@/stores/generationStore';
import type { JobStatus } from '@/types';

function statusColor(status: JobStatus): string {
  switch (status) {
    case 'queued': return 'bg-zinc-600 text-zinc-200';
    case 'running': return 'bg-violet-600 text-violet-100';
    case 'complete': return 'bg-emerald-600 text-emerald-100';
    case 'failed': return 'bg-red-600 text-red-100';
    case 'cancelled': return 'bg-zinc-700 text-zinc-400';
    default: return 'bg-zinc-600 text-zinc-200';
  }
}

function typeIcon(status: JobStatus): string {
  switch (status) {
    case 'queued': return '\u23F3';
    case 'running': return '\u25B6';
    case 'complete': return '\u2714';
    case 'failed': return '\u2716';
    case 'cancelled': return '\u23F9';
    default: return '\u2022';
  }
}

export function JobQueue() {
  const { activeJobs, cancelJob } = useGenerationStore();
  const entries = Array.from(activeJobs.entries());

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Job Queue
        </h3>
        <p className="mt-3 text-xs text-zinc-600">No active jobs</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Job Queue
      </h3>
      <ul className="flex flex-col gap-2">
        {entries.map(([id, job]) => (
          <li
            key={id}
            className="flex items-center gap-3 rounded-lg bg-zinc-800/60 px-3 py-2.5"
          >
            <span className="text-base" aria-hidden="true">
              {typeIcon(job.status)}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-xs font-medium text-zinc-200">{id}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{job.stage}</span>
            </div>
            {(job.status === 'queued' || job.status === 'running') && (
              <button
                onClick={() => cancelJob(id)}
                className="rounded p-1 text-xs text-zinc-500 transition hover:bg-zinc-700 hover:text-zinc-300"
                aria-label={`Cancel job ${id}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
