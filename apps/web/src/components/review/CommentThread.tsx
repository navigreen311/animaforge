'use client';

import { useState } from 'react';

interface Comment {
  id: string;
  user: { name: string; avatarColor: string };
  text: string;
  timestamp: string;
  timecode?: string;
}

interface CommentThreadProps {
  shotId: string;
  onClose: () => void;
}

const mockComments: Comment[] = [
  {
    id: 'c1',
    user: { name: 'Alex Chen', avatarColor: 'bg-violet-500' },
    text: 'Lighting looks great on this take. The rim light on the left shoulder really sells the depth.',
    timestamp: '2 hours ago',
    timecode: '00:02.14',
  },
  {
    id: 'c2',
    user: { name: 'Maya Rivera', avatarColor: 'bg-cyan-500' },
    text: 'Can we push the color grading a bit warmer? Feels too cool for this scene.',
    timestamp: '1 hour ago',
    timecode: '00:04.30',
  },
  {
    id: 'c3',
    user: { name: 'Jordan Lee', avatarColor: 'bg-amber-500' },
    text: 'Approved from my side. Motion is smooth and consistent with the previous shot.',
    timestamp: '30 min ago',
  },
];

export default function CommentThread({ shotId, onClose }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [timecodeRef, setTimecodeRef] = useState('');
  const [comments, setComments] = useState<Comment[]>(mockComments);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      user: { name: 'You', avatarColor: 'bg-violet-500' },
      text: newComment.trim(),
      timestamp: 'Just now',
      timecode: timecodeRef || undefined,
    };
    setComments((prev) => [...prev, comment]);
    setNewComment('');
    setTimecodeRef('');
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-200">
          Comments &mdash; Shot {shotId}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className={`w-7 h-7 rounded-full ${c.user.avatarColor} flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white`}>
              {c.user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-gray-200">{c.user.name}</span>
                <span className="text-[10px] text-gray-600">{c.timestamp}</span>
                {c.timecode && (
                  <span className="text-[10px] font-mono bg-violet-900/40 text-violet-300 px-1.5 py-0.5 rounded">
                    {c.timecode}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Timecode (e.g. 00:03.12)"
            value={timecodeRef}
            onChange={(e) => setTimecodeRef(e.target.value)}
            className="w-32 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:border-violet-600 focus:outline-none"
          />
          <span className="text-[10px] text-gray-600">optional timecode ref</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-violet-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-medium text-white transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
