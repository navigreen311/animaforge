'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import ReviewCard, { type ReviewShot } from '@/components/review/ReviewCard';
import CommentThread from '@/components/review/CommentThread';
import ApprovalFlow from '@/components/review/ApprovalFlow';
import type { BadgeStatus } from '@/components/shared/Badge';

type FilterStatus = 'all' | 'review' | 'approved' | 'draft';

const mockShots: ReviewShot[] = [
  { id: 's1', shotNumber: 1, scene: 'INT-01', duration: '4.2s', status: 'review', commentCount: 3 },
  { id: 's2', shotNumber: 2, scene: 'INT-01', duration: '3.8s', status: 'approved', commentCount: 1 },
  { id: 's3', shotNumber: 3, scene: 'EXT-02', duration: '6.1s', status: 'draft', commentCount: 0 },
  { id: 's4', shotNumber: 4, scene: 'EXT-02', duration: '2.9s', status: 'review', commentCount: 5 },
  { id: 's5', shotNumber: 5, scene: 'INT-03', duration: '5.5s', status: 'review', commentCount: 2 },
  { id: 's6', shotNumber: 6, scene: 'INT-03', duration: '4.0s', status: 'locked', commentCount: 4 },
  { id: 's7', shotNumber: 7, scene: 'EXT-04', duration: '3.3s', status: 'draft', commentCount: 0 },
  { id: 's8', shotNumber: 8, scene: 'EXT-04', duration: '7.1s', status: 'approved', commentCount: 2 },
];

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Rejected / Draft' },
];

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [shots, setShots] = useState<ReviewShot[]>(mockShots);
  const [commentShotId, setCommentShotId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = filter === 'all' ? shots : shots.filter((s) => s.status === filter);

  const updateStatus = (id: string, status: BadgeStatus) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const bulkUpdate = (status: BadgeStatus) => {
    setShots((prev) =>
      prev.map((s) => (selectedIds.has(s.id) ? { ...s, status } : s))
    );
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingCount = shots.filter((s) => s.status === 'review').length;

  return (
    <div className="flex gap-6">
      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Review &amp; Approval</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Project {params.id} &mdash; {pendingCount} shot{pendingCount !== 1 ? 's' : ''} pending review
            </p>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              <button
                type="button"
                onClick={() => bulkUpdate('approved')}
                className="rounded-lg bg-green-600 hover:bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                Bulk Approve
              </button>
              <button
                type="button"
                onClick={() => bulkUpdate('draft')}
                className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                Bulk Reject
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Shot gallery grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((shot) => (
            <div key={shot.id} className="relative">
              {/* Selection checkbox */}
              <button
                type="button"
                onClick={() => toggleSelect(shot.id)}
                className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  selectedIds.has(shot.id)
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-gray-900/80 border-gray-600 text-transparent hover:border-gray-400'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <ReviewCard
                shot={shot}
                onApprove={(id) => updateStatus(id, 'approved')}
                onReject={(id) => updateStatus(id, 'draft')}
                onOpenComments={(id) => setCommentShotId(id)}
              />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-500">No shots match this filter.</p>
          </div>
        )}

        {/* Approval Flow */}
        <div className="mt-8">
          <ApprovalFlow
            currentStep="review"
            approver="Alex Chen"
            approvedAt="Mar 24, 2026"
            onLock={() => {}}
            onUnlock={() => {}}
          />
        </div>
      </div>

      {/* Comment side panel */}
      {commentShotId && (
        <div className="w-80 flex-shrink-0">
          <CommentThread
            shotId={commentShotId}
            onClose={() => setCommentShotId(null)}
          />
        </div>
      )}
    </div>
  );
}
