'use client';

import type { RenderJob } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RenderQueuePanelProps {
  jobs: RenderJob[];
  loading?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Skeleton row (loading placeholder)                                 */
/* ------------------------------------------------------------------ */

function SkeletonRow() {
  return (
    <div
      className="flex flex-col gap-[4px] animate-pulse"
      style={{
        padding: 8,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-[6px]">
        <div
          className="rounded-full"
          style={{ width: 6, height: 6, background: 'var(--text-tertiary)' }}
        />
        <div
          className="flex-1 rounded"
          style={{ height: 10, background: 'var(--bg-overlay)' }}
        />
        <div
          className="rounded"
          style={{ width: 40, height: 12, background: 'var(--bg-overlay)' }}
        />
      </div>
      <div className="flex items-center gap-[6px]">
        <div
          className="flex-1 rounded"
          style={{ height: 3, background: 'var(--progress-track)' }}
        />
        <div
          className="rounded"
          style={{ width: 28, height: 10, background: 'var(--bg-overlay)' }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Job row                                                            */
/* ------------------------------------------------------------------ */

function JobRow({ job }: { job: RenderJob }) {
  const isRunning = job.status === 'running';
  const isQueued = job.status === 'queued';

  return (
    <div
      className="flex flex-col gap-[4px]"
      style={{
        padding: 8,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
      }}
    >
      {/* Top line */}
      <div className="flex items-center gap-[6px]">
        {/* Status dot */}
        <span
          className={`shrink-0 rounded-full${isRunning ? ' animate-pulse-dot' : ''}`}
          style={{
            width: 6,
            height: 6,
            background: isRunning
              ? 'var(--status-generating-text)'
              : isQueued
                ? 'var(--text-tertiary)'
                : 'var(--text-tertiary)',
          }}
        />

        {/* Job name */}
        <span
          className="flex-1 truncate"
          style={{ fontSize: 11, color: 'var(--text-primary)' }}
        >
          Shot {job.shotNumber} &mdash; {job.projectTitle}
        </span>

        {/* Tier badge */}
        <span
          className="shrink-0 uppercase"
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-overlay)',
            padding: '1px 6px',
            borderRadius: 3,
          }}
        >
          {job.tier}
        </span>
      </div>

      {/* Progress line (running jobs only) */}
      {isRunning && (
        <div className="flex items-center gap-[6px]">
          {/* Progress bar */}
          <div
            className="flex-1 overflow-hidden"
            style={{
              height: 3,
              background: 'var(--progress-track)',
              borderRadius: 2,
            }}
          >
            <div
              role="progressbar"
              aria-valuenow={job.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                height: '100%',
                width: `${job.progress}%`,
                background: 'var(--brand)',
                transition: 'width 300ms',
              }}
            />
          </div>

          {/* Percentage */}
          <span
            className="shrink-0 text-right"
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              minWidth: 28,
            }}
          >
            {job.progress}%
          </span>

          {/* ETA */}
          {job.estimatedSecondsRemaining != null && (
            <span
              className="shrink-0"
              style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
            >
              ~{job.estimatedSecondsRemaining}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function RenderQueuePanel({ jobs, loading }: RenderQueuePanelProps) {
  const activeJobs = jobs.filter(
    (j) => j.status === 'running' || j.status === 'queued',
  );

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 14,
      }}
    >
      {/* Header */}
      <div className="mb-[12px] flex items-center justify-between">
        {/* Left: title + count */}
        <div className="flex items-center gap-[6px]">
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Render queue
          </span>
          <span
            className="inline-flex min-w-[16px] items-center justify-center"
            style={{
              height: 16,
              background: 'var(--status-generating-bg)',
              color: 'var(--status-generating-text)',
              border: '0.5px solid var(--status-generating-border)',
              borderRadius: 'var(--radius-pill)',
              fontSize: 9,
              fontWeight: 600,
            }}
          >
            {activeJobs.length}
          </span>
        </div>

        {/* Right: view all */}
        <button
          className="hover:underline"
          style={{ fontSize: 10, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View all
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-col gap-[6px]">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : jobs.length === 0 ? (
        <p
          className="text-center"
          style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '24px 0' }}
        >
          No active renders. Generate a shot to start.
        </p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

export default RenderQueuePanel;
