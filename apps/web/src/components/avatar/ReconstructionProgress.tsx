'use client';

import { useAvatarStore } from '@/stores/avatarStore';

const PIPELINE_STEPS = [
  { num: 1, label: 'Multi-view alignment' },
  { num: 2, label: 'Volumetric reconstruction' },
  { num: 3, label: 'Mesh extraction' },
  { num: 4, label: 'Texture baking' },
  { num: 5, label: 'FLAME fitting' },
  { num: 6, label: 'Body estimation' },
  { num: 7, label: 'Quality validation' },
];

function estimateTimeRemaining(currentStep: number, percent: number): string {
  const avgSecondsPerStep = 45;
  const remainingInCurrent = ((100 - percent) / 100) * avgSecondsPerStep;
  const remainingSteps = 7 - currentStep;
  const totalSeconds = Math.round(remainingInCurrent + remainingSteps * avgSecondsPerStep);

  if (totalSeconds < 60) return `~${totalSeconds}s remaining`;
  const mins = Math.ceil(totalSeconds / 60);
  return `~${mins} min remaining`;
}

export default function ReconstructionProgress() {
  const { step, totalSteps, stepName, percent } = useAvatarStore(
    (s) => s.reconstructionProgress
  );
  const activeAvatar = useAvatarStore((s) => s.activeAvatar);
  const job = useAvatarStore((s) =>
    s.avatarJobs.find((j) => j.id === s.activeAvatar)
  );

  if (!activeAvatar || !job || job.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 py-16">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Upload photos to begin reconstruction</p>
      </div>
    );
  }

  const isComplete = job.status === 'complete';
  const isCancelled = job.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">X5 Pipeline</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isComplete
              ? 'Reconstruction complete'
              : isCancelled
                ? 'Job cancelled'
                : stepName}
          </p>
        </div>
        {!isComplete && !isCancelled && step > 0 && (
          <span className="text-xs text-gray-500">{estimateTimeRemaining(step, percent)}</span>
        )}
      </div>

      {/* Step list */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((ps) => {
          const isActive = ps.num === step && !isComplete && !isCancelled;
          const isDone = isComplete || ps.num < step;

          return (
            <div
              key={ps.num}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive ? 'bg-violet-600/10 border border-violet-500/30' : 'border border-transparent'
              }`}
            >
              {/* Step indicator */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone
                    ? 'bg-violet-600 text-white'
                    : isActive
                      ? 'border-2 border-violet-500 text-violet-400'
                      : 'border border-gray-700 text-gray-600'
                }`}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  ps.num
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm ${
                  isDone
                    ? 'text-gray-300'
                    : isActive
                      ? 'text-violet-300 font-medium'
                      : 'text-gray-600'
                }`}
              >
                {ps.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current step progress bar */}
      {!isComplete && !isCancelled && step > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Step {step}/{totalSteps}</span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
