'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FeatureHighlight from '@/components/onboarding/FeatureHighlight';

const tourFeatures = [
  {
    title: 'Timeline Editor',
    description:
      'Arrange clips, transitions, and effects on a multi-track timeline. AI auto-suggests cuts and pacing based on your storyboard.',
    screenshotAlt: 'Timeline Editor screenshot',
  },
  {
    title: 'Generation Controls',
    description:
      'Fine-tune prompts, guidance scale, frame count, and seed. Preview generations in real-time before committing to a full render.',
    screenshotAlt: 'Generation Controls screenshot',
  },
  {
    title: 'Style Studio',
    description:
      'Upload reference images, blend multiple style vectors, and lock a consistent aesthetic across every scene in your project.',
    screenshotAlt: 'Style Studio screenshot',
  },
];

export default function TourPage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const router = useRouter();

  const isLast = currentFeature === tourFeatures.length - 1;

  return (
    <div className="w-full">
      <h1 className="mb-2 text-center text-3xl font-bold">Quick Tour</h1>
      <p className="mb-10 text-center text-zinc-400">
        See what you can do with AnimaForge.
      </p>

      <FeatureHighlight {...tourFeatures[currentFeature]} />

      {/* Dot indicators */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {tourFeatures.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentFeature(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              i === currentFeature ? 'scale-125 bg-violet-500' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        {!isLast ? (
          <>
            <button
              onClick={() => router.push('/projects')}
              className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={() => setCurrentFeature((prev) => prev + 1)}
              className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-violet-500"
            >
              Next
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push('/projects')}
            className="rounded-lg bg-violet-600 px-8 py-3 font-medium transition-colors hover:bg-violet-500"
          >
            Start Creating
          </button>
        )}
      </div>
    </div>
  );
}
