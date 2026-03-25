'use client';

import { useState } from 'react';
import Badge, { type BadgeStatus } from '@/components/shared/Badge';

export interface ReviewShot {
  id: string;
  shotNumber: number;
  scene: string;
  duration: string;
  status: BadgeStatus;
  thumbnailUrl?: string;
  commentCount: number;
}

interface ReviewCardProps {
  shot: ReviewShot;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpenComments: (id: string) => void;
}

export default function ReviewCard({ shot, onApprove, onReject, onOpenComments }: ReviewCardProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="group rounded-xl border border-gray-800 bg-gray-900 overflow-hidden hover:border-violet-600/50 transition-all"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Preview placeholder */}
      <div className="relative aspect-video bg-gray-800 flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        {/* Hover overlay with actions */}
        {hovering && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => onApprove(shot.id)}
              className="rounded-lg bg-green-600/90 hover:bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(shot.id)}
              className="rounded-lg bg-red-600/90 hover:bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-100">
            Shot {shot.shotNumber}
          </span>
          <Badge status={shot.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>Scene: {shot.scene}</span>
          <span>{shot.duration}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onApprove(shot.id)}
              className="rounded-lg border border-green-700/50 bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-900/40 transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(shot.id)}
              className="rounded-lg border border-red-700/50 bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/40 transition-colors"
            >
              Reject
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenComments(shot.id)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {shot.commentCount}
          </button>
        </div>
      </div>
    </div>
  );
}
