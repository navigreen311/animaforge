'use client';

import { useAvatarStore } from '@/stores/avatarStore';

export default function AvatarPreview() {
  const previewUrl = useAvatarStore((s) => s.previewUrl);
  const job = useAvatarStore((s) =>
    s.avatarJobs.find((j) => j.id === s.activeAvatar)
  );

  const qualityScore = job?.qualityScore ?? null;
  const isComplete = job?.status === 'complete';

  return (
    <div className="flex flex-col h-full">
      {/* 3D Preview area */}
      <div className="flex-1 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-center min-h-[360px] relative overflow-hidden">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
            <p className="text-sm">3D preview will appear here</p>
          </div>
        )}

        {/* Rotate/Zoom controls */}
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {['Rotate', 'Zoom', 'Pan'].map((action) => (
            <button
              key={action}
              type="button"
              className="px-2.5 py-1.5 text-xs font-medium bg-gray-800/80 border border-gray-700 text-gray-400 rounded-md hover:bg-gray-700/80 transition-colors backdrop-blur-sm"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Quality score */}
      {isComplete && (
        <div className="mt-4 rounded-lg bg-gray-900/60 border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Identity Similarity
              </p>
              <p className="text-2xl font-bold text-gray-100 mt-1">
                {qualityScore !== null ? qualityScore.toFixed(2) : '--'}
              </p>
            </div>
            {qualityScore !== null && qualityScore < 0.92 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
                <span className="text-xs text-amber-300 font-medium">
                  Score &lt; 0.92 &mdash; retrigger recommended
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
