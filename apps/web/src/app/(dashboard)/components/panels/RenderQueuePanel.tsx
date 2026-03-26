'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Video, Music, User } from 'lucide-react';
import { toast } from 'sonner';
import type { RenderJob } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RenderQueuePanelProps {
  jobs: RenderJob[];
  loading?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Tier badge styling                                                 */
/* ------------------------------------------------------------------ */

const TIER_STYLES: Record<
  RenderJob['tier'],
  { background: string; color: string; border?: string }
> = {
  preview: {
    background: 'var(--status-draft-bg, rgba(255,255,255,0.06))',
    color: 'var(--status-draft-text, var(--text-tertiary))',
    border: '0.5px solid var(--status-draft-border, transparent)',
  },
  standard: {
    background: 'var(--brand-dim, rgba(99,102,241,0.15))',
    color: 'var(--brand-light, var(--brand))',
  },
  final: {
    background: 'var(--status-complete-bg, rgba(34,197,94,0.12))',
    color: 'var(--status-complete-text, #4ade80)',
    border: '0.5px solid var(--status-complete-border, transparent)',
  },
};

/* ------------------------------------------------------------------ */
/*  Job type icon                                                      */
/* ------------------------------------------------------------------ */

function JobTypeIcon({ type }: { type?: string }) {
  const props = { size: 12, strokeWidth: 1.8, style: { color: 'var(--text-tertiary)' } };

  switch (type) {
    case 'audio':
      return <Music {...props} />;
    case 'avatar':
      return <User {...props} />;
    case 'video':
    default:
      return <Video {...props} />;
  }
}

/* ------------------------------------------------------------------ */
/*  ETA countdown hook                                                 */
/* ------------------------------------------------------------------ */

function useCountdown(initialSeconds: number | undefined) {
  const [remaining, setRemaining] = useState(initialSeconds ?? 0);

  // Re-sync when the prop changes (e.g. server pushes a new estimate)
  useEffect(() => {
    if (initialSeconds != null) {
      setRemaining(initialSeconds);
    }
  }, [initialSeconds]);

  useEffect(() => {
    if (initialSeconds == null || remaining <= 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, [initialSeconds, remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (initialSeconds == null) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return mins > 0 ? `~${mins}m ${secs}s` : `~${secs}s`;
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

function JobRow({
  job,
  onCancel,
}: {
  job: RenderJob;
  onCancel: (id: string) => void;
}) {
  const isRunning = job.status === 'running';
  const isQueued = job.status === 'queued';
  const showBar = isRunning || isQueued;
  const eta = useCountdown(isRunning ? job.estimatedSecondsRemaining : undefined);
  const tierStyle = TIER_STYLES[job.tier];

  return (
    <div
      className="group relative flex flex-col gap-[4px]"
      style={{
        padding: 8,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
      }}
    >
      {/* Cancel button — visible on hover */}
      <button
        type="button"
        aria-label={`Cancel render for Shot ${job.shotNumber}`}
        onClick={() => onCancel(job.id)}
        className="absolute right-[6px] top-[6px] hidden items-center justify-center rounded group-hover:flex"
        style={{
          width: 18,
          height: 18,
          background: 'var(--bg-overlay)',
          border: '0.5px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          transition: 'color 120ms, background 120ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--status-error-text, #f87171)';
          e.currentTarget.style.background = 'var(--status-error-bg, rgba(248,113,113,0.12))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)';
          e.currentTarget.style.background = 'var(--bg-overlay)';
        }}
      >
        <X size={10} strokeWidth={2} />
      </button>

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
              : 'var(--text-tertiary)',
          }}
        />

        {/* Job type icon */}
        <JobTypeIcon type={(job as any).type} />

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
            color: tierStyle.color,
            background: tierStyle.background,
            border: tierStyle.border ?? 'none',
            padding: '1px 6px',
            borderRadius: 3,
            fontWeight: 500,
          }}
        >
          {job.tier}
        </span>
      </div>

      {/* Progress line (running + queued jobs) */}
      {showBar && (
        <div className="flex items-center gap-[6px]">
          {/* Progress bar — always visible, even at 0% */}
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

          {/* ETA countdown */}
          {eta != null && (
            <span
              className="shrink-0"
              style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
            >
              {eta}
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
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const handleCancel = useCallback((id: string) => {
    setHiddenIds((prev) => new Set(prev).add(id));
    toast('Job cancelled');
  }, []);

  const visibleJobs = jobs.filter((j) => !hiddenIds.has(j.id));
  const activeJobs = visibleJobs.filter(
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
      ) : visibleJobs.length === 0 ? (
        <p
          className="text-center"
          style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '24px 0' }}
        >
          No active renders. Generate a shot to start.
        </p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {visibleJobs.map((job) => (
            <JobRow key={job.id} job={job} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
}

export default RenderQueuePanel;
