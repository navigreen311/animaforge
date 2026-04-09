'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Layers,
  Clock,
  Zap,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ShotStatus = 'draft' | 'generating' | 'review' | 'approved' | 'rejected';
type RenderTier = 'preview' | 'standard' | 'final';
type ScheduleOption = 'now' | 'tonight';
type BatchPhase = 'configure' | 'progress';

interface MockShot {
  id: string;
  number: number;
  name: string;
  status: ShotStatus;
  estimatedCredits: number;
}

interface BatchShotProgress {
  id: string;
  number: number;
  name: string;
  progress: 'queued' | 'rendering' | 'complete' | 'failed' | 'cancelled';
  percent: number;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_SHOTS: MockShot[] = [
  { id: 's1', number: 1, name: 'Wide Establishing — City Skyline', status: 'draft', estimatedCredits: 12 },
  { id: 's2', number: 2, name: 'Medium — Hero Enters Frame', status: 'draft', estimatedCredits: 8 },
  { id: 's3', number: 3, name: 'Close-up — Hero Expression', status: 'approved', estimatedCredits: 6 },
  { id: 's4', number: 4, name: 'Over-the-Shoulder — Dialogue A', status: 'draft', estimatedCredits: 10 },
  { id: 's5', number: 5, name: 'Reverse — Dialogue B', status: 'draft', estimatedCredits: 10 },
  { id: 's6', number: 6, name: 'Wide — Chase Sequence', status: 'rejected', estimatedCredits: 18 },
  { id: 's7', number: 7, name: 'Aerial — Rooftop Transition', status: 'draft', estimatedCredits: 15 },
  { id: 's8', number: 8, name: 'Close-up — Object Insert', status: 'approved', estimatedCredits: 4 },
  { id: 's9', number: 9, name: 'Medium — Crowd Reaction', status: 'draft', estimatedCredits: 12 },
  { id: 's10', number: 10, name: 'Wide — Sunset Finale', status: 'draft', estimatedCredits: 14 },
];

const TIER_MULTIPLIER: Record<RenderTier, number> = {
  preview: 0.5,
  standard: 1,
  final: 2,
};

const TIER_LABELS: Record<RenderTier, string> = {
  preview: 'Preview (fast, lower quality)',
  standard: 'Standard',
  final: 'Final (highest quality)',
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface BatchGenerateModalProps {
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BatchGenerateModal({ open, onClose }: BatchGenerateModalProps) {
  /* ---- State ---------------------------------------------------- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const drafts = MOCK_SHOTS.filter((s) => s.status !== 'approved');
    return new Set(drafts.map((s) => s.id));
  });
  const [tier, setTier] = useState<RenderTier>('standard');
  const [schedule, setSchedule] = useState<ScheduleOption>('now');
  const [phase, setPhase] = useState<BatchPhase>('configure');
  const [batchProgress, setBatchProgress] = useState<BatchShotProgress[]>([]);

  /* ---- Derived -------------------------------------------------- */
  const draftShots = useMemo(() => MOCK_SHOTS.filter((s) => s.status !== 'approved'), []);
  const allDraftIds = useMemo(() => new Set(draftShots.map((s) => s.id)), [draftShots]);

  const selectedCount = selectedIds.size;
  const totalCredits = useMemo(() => {
    let sum = 0;
    for (const shot of MOCK_SHOTS) {
      if (selectedIds.has(shot.id)) {
        sum += shot.estimatedCredits * TIER_MULTIPLIER[tier];
      }
    }
    return Math.round(sum);
  }, [selectedIds, tier]);

  const estimatedMinutes = useMemo(() => Math.max(1, Math.round(selectedCount * 1.5 * TIER_MULTIPLIER[tier])), [selectedCount, tier]);

  const allDraftsSelected = draftShots.length > 0 && draftShots.every((s) => selectedIds.has(s.id));
  const someDraftsSelected = draftShots.some((s) => selectedIds.has(s.id));

  /* ---- Handlers ------------------------------------------------- */
  const toggleShot = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allDraftsSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allDraftIds));
    }
  }, [allDraftsSelected, allDraftIds]);

  const handleQueue = useCallback(async () => {
    // Mock POST
    await new Promise((r) => setTimeout(r, 400));
    toast.success(`${selectedCount} shots queued for batch generation`);

    // Switch to progress view
    const progressItems: BatchShotProgress[] = MOCK_SHOTS
      .filter((s) => selectedIds.has(s.id))
      .map((s, i) => ({
        id: s.id,
        number: s.number,
        name: s.name,
        progress: i === 0 ? 'rendering' : 'queued',
        percent: i === 0 ? 23 : 0,
      }));
    setBatchProgress(progressItems);
    setPhase('progress');
  }, [selectedCount, selectedIds]);

  const handleCancelRemaining = useCallback(() => {
    setBatchProgress((prev) =>
      prev.map((s) =>
        s.progress === 'queued' ? { ...s, progress: 'cancelled' } : s,
      ),
    );
    toast('Remaining shots cancelled');
  }, []);

  const handleClose = useCallback(() => {
    setPhase('configure');
    onClose();
  }, [onClose]);

  /* ---- Status helpers ------------------------------------------- */
  const statusBadge = (status: ShotStatus) => {
    const map: Record<ShotStatus, { bg: string; text: string }> = {
      draft: { bg: 'bg-zinc-700', text: 'Draft' },
      generating: { bg: 'bg-amber-600', text: 'Generating' },
      review: { bg: 'bg-blue-600', text: 'Review' },
      approved: { bg: 'bg-emerald-600', text: 'Approved' },
      rejected: { bg: 'bg-red-600', text: 'Rejected' },
    };
    const s = map[status];
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${s.bg}`}>{s.text}</span>;
  };

  const progressBadge = (p: BatchShotProgress['progress']) => {
    const map: Record<string, { bg: string; text: string }> = {
      queued: { bg: 'bg-zinc-600', text: 'Queued' },
      rendering: { bg: 'bg-amber-600', text: 'Rendering' },
      complete: { bg: 'bg-emerald-600', text: 'Complete' },
      failed: { bg: 'bg-red-600', text: 'Failed' },
      cancelled: { bg: 'bg-zinc-500', text: 'Cancelled' },
    };
    const s = map[p];
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${s.bg}`}>{s.text}</span>;
  };

  /* ---- Render --------------------------------------------------- */
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Batch Generate Shots</h2>
          </div>
          <button onClick={handleClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === 'configure' ? (
          <>
            {/* Select all */}
            <div className="border-b border-zinc-800 px-6 py-3">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100">
                {allDraftsSelected ? (
                  <CheckSquare className="h-4 w-4 text-violet-400" />
                ) : someDraftsSelected ? (
                  <MinusSquare className="h-4 w-4 text-violet-400" />
                ) : (
                  <Square className="h-4 w-4 text-zinc-500" />
                )}
                Select all draft shots ({draftShots.length})
              </button>
            </div>

            {/* Shot list */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <ul className="flex flex-col gap-1">
                {MOCK_SHOTS.map((shot) => {
                  const isApproved = shot.status === 'approved';
                  const isSelected = selectedIds.has(shot.id);

                  return (
                    <li key={shot.id}>
                      <button
                        onClick={() => !isApproved && toggleShot(shot.id)}
                        disabled={isApproved}
                        className={
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ' +
                          (isApproved
                            ? 'cursor-not-allowed opacity-40'
                            : isSelected
                              ? 'bg-violet-600/10 ring-1 ring-violet-500/30'
                              : 'hover:bg-zinc-800')
                        }
                      >
                        {isApproved ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-zinc-600" />
                        ) : isSelected ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-violet-400" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-zinc-500" />
                        )}

                        <span className="w-8 shrink-0 text-xs font-mono text-zinc-500">#{shot.number}</span>
                        <span className="flex-1 truncate text-sm text-zinc-200">{shot.name}</span>
                        {statusBadge(shot.status)}
                        <span className="w-16 text-right text-xs text-zinc-500">
                          ~{Math.round(shot.estimatedCredits * TIER_MULTIPLIER[tier])} cr
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Render tier selector */}
            <div className="border-t border-zinc-800 px-6 py-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Render Tier</p>
              <div className="flex gap-3">
                {(['preview', 'standard', 'final'] as RenderTier[]).map((t) => (
                  <label
                    key={t}
                    className={
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ' +
                      (tier === t
                        ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600')
                    }
                  >
                    <input
                      type="radio"
                      name="renderTier"
                      value={t}
                      checked={tier === t}
                      onChange={() => setTier(t)}
                      className="sr-only"
                    />
                    {TIER_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule option */}
            <div className="border-t border-zinc-800 px-6 py-3">
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="schedule"
                    value="now"
                    checked={schedule === 'now'}
                    onChange={() => setSchedule('now')}
                    className="accent-violet-500"
                  />
                  <Zap className="h-3.5 w-3.5" />
                  Generate now
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="schedule"
                    value="tonight"
                    checked={schedule === 'tonight'}
                    onChange={() => setSchedule('tonight')}
                    className="accent-violet-500"
                  />
                  <Clock className="h-3.5 w-3.5" />
                  Schedule for tonight 2 AM
                </label>
              </div>
            </div>

            {/* Summary + actions */}
            <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
              <p className="text-sm text-zinc-400">
                <span className="font-medium text-zinc-200">{selectedCount} shots</span> selected
                {' · '}~{totalCredits} credits{' · '}Est: {estimatedMinutes} min
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQueue}
                  disabled={selectedCount === 0}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Queue {selectedCount} shots &rarr;
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ---- Progress phase ---- */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="mb-3 text-sm text-zinc-400">
                Batch generation in progress &mdash;{' '}
                {batchProgress.filter((s) => s.progress === 'complete').length}/{batchProgress.length} complete
              </p>
              <ul className="flex flex-col gap-2">
                {batchProgress.map((shot) => (
                  <li
                    key={shot.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3"
                  >
                    <span className="w-8 shrink-0 text-xs font-mono text-zinc-500">#{shot.number}</span>
                    <span className="flex-1 truncate text-sm text-zinc-200">{shot.name}</span>
                    {progressBadge(shot.progress)}
                    {shot.progress === 'rendering' && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{ width: `${shot.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">{shot.percent}%</span>
                      </div>
                    )}
                    {shot.progress === 'rendering' && (
                      <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Progress footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
              <button
                onClick={handleCancelRemaining}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel remaining
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
