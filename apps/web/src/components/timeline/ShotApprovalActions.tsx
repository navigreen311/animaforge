'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { ShotStatus } from './TimelineRoot';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ShotApprovalActionsProps {
  shotId: string;
  shotNumber: number;
  currentStatus: ShotStatus;
  onStatusChange: (shotId: string, newStatus: ShotStatus) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ShotApprovalActions({
  shotId,
  shotNumber,
  currentStatus,
  onStatusChange,
}: ShotApprovalActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  /* ---- Approve --------------------------------------------------- */
  const handleApprove = useCallback(async () => {
    setLoading('approve');
    // Optimistic update
    onStatusChange(shotId, 'approved');

    try {
      const res = await fetch(`/api/shots/${shotId}/approve`, {
        method: 'PUT',
      });
      if (!res.ok) {
        throw new Error('Failed to approve shot');
      }
      toast.success(`Shot #${shotNumber} approved`);
    } catch {
      // Rollback on failure
      onStatusChange(shotId, currentStatus);
      toast.error(`Failed to approve Shot #${shotNumber}`);
    } finally {
      setLoading(null);
    }
  }, [shotId, shotNumber, currentStatus, onStatusChange]);

  /* ---- Reject ---------------------------------------------------- */
  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setLoading('reject');
    onStatusChange(shotId, 'rejected');

    try {
      const res = await fetch(`/api/shots/${shotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', rejectionReason: rejectReason.trim() }),
      });
      if (!res.ok) {
        throw new Error('Failed to reject shot');
      }
      toast.success(`Shot #${shotNumber} sent back to draft`);
      setShowRejectInput(false);
      setRejectReason('');
    } catch {
      onStatusChange(shotId, currentStatus);
      toast.error(`Failed to reject Shot #${shotNumber}`);
    } finally {
      setLoading(null);
    }
  }, [shotId, shotNumber, currentStatus, rejectReason, onStatusChange]);

  /* ---- Regenerate ------------------------------------------------ */
  const handleRegenerate = useCallback(async () => {
    setLoading('regenerate');
    onStatusChange(shotId, 'generating');

    try {
      const res = await fetch(`/api/shots/${shotId}/generate`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to regenerate shot');
      }
      toast.success(`Shot #${shotNumber} queued for regeneration`);
    } catch {
      onStatusChange(shotId, currentStatus);
      toast.error(`Failed to regenerate Shot #${shotNumber}`);
    } finally {
      setLoading(null);
    }
  }, [shotId, shotNumber, currentStatus, onStatusChange]);

  /* ---- Render ---------------------------------------------------- */
  const isLocked = currentStatus === 'approved';

  return (
    <div className="flex flex-col gap-2">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={loading !== null || isLocked}
          className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading === 'approve' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span aria-hidden>&#10003;</span>
          )}
          Approve
        </button>

        <button
          onClick={() => setShowRejectInput((v) => !v)}
          disabled={loading !== null || isLocked}
          className="flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden>&#10007;</span>
          Reject
        </button>

        <button
          onClick={handleRegenerate}
          disabled={loading !== null}
          className="flex items-center gap-1 rounded bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading === 'regenerate' ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-200 border-t-transparent" />
          ) : (
            <span aria-hidden>&#8635;</span>
          )}
          Regenerate
        </button>
      </div>

      {/* Reject reason popover */}
      {showRejectInput && (
        <div className="flex flex-col gap-2 rounded border border-zinc-700 bg-zinc-800 p-3">
          <label htmlFor="reject-reason" className="text-[10px] uppercase tracking-wider text-zinc-400">
            Rejection reason
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="What needs to change?"
            rows={2}
            className="resize-none rounded bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none ring-1 ring-zinc-700 focus:ring-violet-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowRejectInput(false);
                setRejectReason('');
              }}
              className="rounded px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={loading === 'reject'}
              className="rounded bg-red-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-red-500 disabled:opacity-40"
            >
              {loading === 'reject' ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
