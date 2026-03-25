'use client';

import AvatarUploader from '@/components/avatar/AvatarUploader';
import ReconstructionProgress from '@/components/avatar/ReconstructionProgress';
import AvatarPreview from '@/components/avatar/AvatarPreview';
import AvatarExporter from '@/components/avatar/AvatarExporter';
import { useAvatarStore } from '@/stores/avatarStore';

export default function AvatarStudioPage() {
  const activeAvatar = useAvatarStore((s) => s.activeAvatar);
  const job = useAvatarStore((s) =>
    s.avatarJobs.find((j) => j.id === s.activeAvatar)
  );
  const cancelJob = useAvatarStore((s) => s.cancelJob);

  const isRunning = job?.status === 'running';
  const isComplete = job?.status === 'complete';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Avatar Creation Studio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload reference photos and reconstruct a production-ready 3D avatar using the X5 pipeline
        </p>
      </div>

      {/* Step indicator */}
      {activeAvatar && job && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const stepNum = i + 1;
              const isDone = isComplete || stepNum < job.progress.step;
              const isActive = stepNum === job.progress.step && isRunning;
              return (
                <div
                  key={stepNum}
                  className={`w-8 h-1.5 rounded-full transition-colors ${
                    isDone
                      ? 'bg-violet-500'
                      : isActive
                        ? 'bg-violet-400 animate-pulse'
                        : 'bg-gray-800'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-xs text-gray-500">
            {isComplete
              ? 'Complete'
              : isRunning
                ? `Step ${job.progress.step}/7`
                : job.status === 'cancelled'
                  ? 'Cancelled'
                  : 'Idle'}
          </span>
          {isRunning && (
            <button
              type="button"
              onClick={() => cancelJob(job.id)}
              className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: Upload / Configure */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Upload &amp; Configure
            </h2>
            <AvatarUploader />
          </div>

          {/* Reconstruction progress */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Reconstruction Progress
            </h2>
            <ReconstructionProgress />
          </div>
        </div>

        {/* Right panel: Preview / Export */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              3D Preview
            </h2>
            <AvatarPreview />
          </div>

          {/* Export */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <AvatarExporter />
          </div>
        </div>
      </div>
    </div>
  );
}
