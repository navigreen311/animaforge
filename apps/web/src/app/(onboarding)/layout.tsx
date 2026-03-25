'use client';

import { usePathname } from 'next/navigation';
import StepIndicator from '@/components/onboarding/StepIndicator';

const stepMap: Record<string, number> = {
  '/onboarding/welcome': 1,
  '/onboarding/setup': 2,
  '/onboarding/tour': 3,
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStep = stepMap[pathname] ?? 1;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 text-white">
      {/* Progress bar */}
      <div className="w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4">
          <span className="text-sm font-bold tracking-tight">
            <span className="text-violet-400">Anima</span>Forge
          </span>
          <StepIndicator currentStep={currentStep} totalSteps={3} />
        </div>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
