'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGenerationStore } from '@/stores/generationStore';
import { apiClient } from '@/lib/api';
import type { JobStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Filter type                                                        */
/* ------------------------------------------------------------------ */

type JobFilter = 'all' | 'running' | 'complete' | 'failed';

const FILTERS: { value: JobFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'complete', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: JobStatus): string {
  switch (status) {
    case 'queued':
      return 'bg-zinc-600 text-zinc-200';
    case 'running':
      return 'bg-violet-600 text-violet-100';
    case 'complete':
      return 'bg-emerald-600 text-emerald-100';
    case 'failed':
      return 'bg-red-600 text-red-100';
    case 'cancelled':
      return 'bg-zinc-700 text-zinc-400';
    default:
      return 'bg-zinc-600 text-zinc-200';
  }
}

function typeIcon(status: JobStatus): string {
  switch (status) {
    case 'queued':
      return '\u23F3';
    case 'running':
      return '\u25B6';
    case 'complete':
      return '\u2714';
    case 'failed':
      return '\u2716';
    case 'cancelled':
      return '\u23F9';
    default:
      return '\u2022';
  }
}

function matchesFilter(status: JobStatus, filter: JobFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'running') return status === 'queued' || status === 'running';
  if (filter === 'complete') return status === 'complete';
  if (filter === 'failed') return status === 'failed' || status === 'cancelled';
  return true;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function JobQueue() {
  const { activeJobs, cancelJob: storeCancelJob } = useGenerationStore();
  const [filter, setFilter] = useState<JobFilter>('all');
  const [, setTick] = useState(0);

  // Re-render every second to update elapsed time for running jobs
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const entries = Array.from(activeJobs.entries()).filter(([, job]) =>
    matchesFilter(job.status, filter),
  );

  const handleCancel = useCallback(
    async (jobId: string) => {
      try {
        await apiClient.post(`/ai/v1/jobs/${jobId}/cancel`);
        storeCancelJob(jobId);
      } catch {
        storeCancelJob(jobId);
      }
    },
    [storeCancelJob],
  );

  const handleRetry = useCallback(async (jobId: string) => {
    const parts = jobId.split('_');
    const shotId = parts.length >= 2 ? parts[1] : '';
    if (!shotId) return;

    try {
      await apiClient.post('/ai/v1/generate/video', { shotId, tier: 'standard' });
    } catch {
      // Retry silently fails - user can try again
    }
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Job Queue
        </h3>
        <span className="text-[10px] text-zinc-600">
          {entries.length} job{entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase transition ${
              filter === f.value
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <p className="py-4 text-center text-xs text-zinc-600">
          {filter === 'all' ? 'No jobs yet' : `No ${filter} jobs`}
        </p>
      )}

      {/* Job list */}
      <ul className="flex flex-col gap-2">
        {entries.map(([id, job]) => (
          <li
            key={id}
            className="flex flex-col gap-2 rounded-lg bg-zinc-800/60 px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              {/* Type icon */}
              <span className="text-base" aria-hidden="true">
                {typeIcon(job.status)}
              </span>

              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  {/* Shot reference */}
                  <span className="truncate text-xs font-medium text-zinc-200">
                    {id}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Stage badge */}
                    <span className="rounded-full bg-zinc-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-200">
                      {job.stage}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(
                        job.status,
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar for active jobs */}
                {(job.status === 'queued' || job.status === 'running') && (
                  <>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">{job.stage}</span>
                      <span className="text-[10px] text-zinc-500">
                        {job.progress}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Cancel button for active jobs */}
              {(job.status === 'queued' || job.status === 'running') && (
                <button
                  onClick={() => handleCancel(id)}
                  className="rounded p-1 text-xs text-zinc-500 transition hover:bg-zinc-700 hover:text-zinc-300"
                  aria-label={`Cancel job ${id}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Completed job extras */}
            {job.status === 'complete' && (
              <div className="flex items-center gap-2 border-t border-zinc-700 pt-2">
                {job.outputUrl && (
                  <div className="h-10 w-16 overflow-hidden rounded bg-zinc-700">
                    <video
                      src={job.outputUrl}
                      className="h-full w-full object-cover"
                      muted
                    />
                  </div>
                )}

                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-100">
                  PASS
                </span>

                <div className="ml-auto flex gap-1.5">
                  {job.outputUrl && (
                    <>
                      <a
                        href={job.outputUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:bg-zinc-600"
                      >
                        View
                      </a>
                      <a
                        href={job.outputUrl}
                        download
                        className="rounded bg-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:bg-zinc-600"
                      >
                        Download
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Failed job extras */}
            {job.status === 'failed' && (
              <div className="flex items-center justify-between border-t border-zinc-700 pt-2">
                <span className="text-[10px] text-red-400">
                  {job.error || 'Unknown error'}
                </span>
                <button
                  onClick={() => handleRetry(id)}
                  className="rounded bg-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:bg-violet-600 hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
