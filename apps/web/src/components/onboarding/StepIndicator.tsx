'use client';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export default function StepIndicator({
  currentStep,
  totalSteps = 3,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                isActive
                  ? 'scale-125 bg-violet-500 ring-4 ring-violet-500/25'
                  : isCompleted
                    ? 'bg-violet-400'
                    : 'bg-zinc-700'
              }`}
            />
            {step < totalSteps && (
              <div
                className={`h-0.5 w-8 transition-colors duration-300 ${
                  isCompleted ? 'bg-violet-400' : 'bg-zinc-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
