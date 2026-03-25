import { useCallback, useEffect, useRef, useState } from 'react';
import { useGenerationStore } from '@/stores/generationStore';
import type { GenerationTier, GenerationStage } from '@/types';

const STAGES: GenerationStage[] = [
  'queued',
  'preprocessing',
  'generating',
  'post-processing',
  'finalizing',
  'complete',
];

const STAGE_PROGRESS: Record<GenerationStage, number> = {
  queued: 0,
  preprocessing: 15,
  generating: 50,
  'post-processing': 75,
  finalizing: 90,
  complete: 100,
  failed: 0,
};

const TIER_COST: Record<GenerationTier, number> = {
  draft: 0.05,
  standard: 0.25,
  premium: 1.0,
};

export function costEstimate(tier: GenerationTier): number {
  return TIER_COST[tier];
}

export function useGeneration() {
  const { addJob, updateJobProgress, completeJob, failJob, activeJobs } =
    useGenerationStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const generate = useCallback(
    (shotId: string, tier: GenerationTier) => {
      setIsGenerating(true);
      setProgress(0);
      setResult(null);
      setError(null);

      const jobId = `job_${shotId}_${Date.now()}`;
      currentJobIdRef.current = jobId;

      addJob(jobId, { status: 'queued', progress: 0, stage: 'queued' });

      let stageIndex = 0;

      intervalRef.current = setInterval(() => {
        stageIndex += 1;

        if (stageIndex >= STAGES.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;

          const outputUrl = `/outputs/${shotId}_${tier}_${Date.now()}.mp4`;
          completeJob(jobId, outputUrl);
          setProgress(100);
          setResult(outputUrl);
          setIsGenerating(false);
          return;
        }

        const stage = STAGES[stageIndex];
        const stageProgress = STAGE_PROGRESS[stage];

        updateJobProgress(jobId, stageProgress, stage);
        setProgress(stageProgress);
      }, 1200);
    },
    [addJob, updateJobProgress, completeJob],
  );

  return { generate, isGenerating, progress, result, error };
}
