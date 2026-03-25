'use client';

type ApprovalStep = 'draft' | 'review' | 'approved' | 'locked';

interface ApprovalFlowProps {
  currentStep: ApprovalStep;
  approver?: string;
  approvedAt?: string;
  onLock?: () => void;
  onUnlock?: () => void;
}

const STEPS: { key: ApprovalStep; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'locked', label: 'Locked' },
];

function stepIndex(step: ApprovalStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export default function ApprovalFlow({ currentStep, approver, approvedAt, onLock, onUnlock }: ApprovalFlowProps) {
  const activeIdx = stepIndex(currentStep);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Approval Workflow
      </h3>

      {/* Step visualization */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((step, i) => {
          const isCompleted = i < activeIdx;
          const isCurrent = i === activeIdx;
          const dotColor = isCompleted
            ? 'bg-green-500'
            : isCurrent
            ? 'bg-violet-500 ring-2 ring-violet-500/30'
            : 'bg-gray-700';
          const labelColor = isCompleted
            ? 'text-green-400'
            : isCurrent
            ? 'text-violet-400'
            : 'text-gray-600';
          const lineColor = isCompleted ? 'bg-green-500' : 'bg-gray-700';

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-3.5 h-3.5 rounded-full ${dotColor} transition-all`} />
                <span className={`text-[10px] mt-1.5 font-medium ${labelColor}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${lineColor} mx-2 mt-[-14px]`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Approver info */}
      {approver && (
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 border-t border-gray-800 pt-4">
          <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
            {approver.charAt(0)}
          </div>
          <div>
            <span className="text-gray-300 font-medium">{approver}</span>
            {approvedAt && (
              <span className="text-gray-600 ml-2">approved {approvedAt}</span>
            )}
          </div>
        </div>
      )}

      {/* Lock/Unlock */}
      <div className="flex gap-2">
        {currentStep === 'approved' && onLock && (
          <button
            type="button"
            onClick={onLock}
            className="rounded-lg border border-purple-700/50 bg-purple-900/20 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-900/40 transition-colors"
          >
            Lock Shot
          </button>
        )}
        {currentStep === 'locked' && onUnlock && (
          <button
            type="button"
            onClick={onUnlock}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 transition-colors"
          >
            Unlock Shot
          </button>
        )}
      </div>
    </div>
  );
}
