import { useCallback, useEffect, useRef, useState } from 'react';
import { useGenerationStore } from '@/stores/generationStore';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { GenerationTier, GenerationStage, SceneGraph, QualityScores } from '@/types';

/* ------------------------------------------------------------------ */
/*  Cost table (credits)                                               */
/* ------------------------------------------------------------------ */

const TIER_CREDITS: Record<GenerationTier, number> = {
  draft: 1,
  standard: 5,
  premium: 12,
};

/** Per-millisecond surcharge applied on top of the base tier cost. */
const MS_RATE: Record<GenerationTier, number> = {
  draft: 0,
  standard: 0.0005,
  premium: 0.001,
};

/* ------------------------------------------------------------------ */
/*  WebSocket URL                                                      */
/* ------------------------------------------------------------------ */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GenerateResponse {
  jobId: string;
  estimatedSeconds: number;
}

interface BalanceResponse {
  credits: number;
}

interface JobProgressEvent {
  jobId: string;
  progress: number;
  stage: GenerationStage;
}

interface JobCompleteEvent {
  jobId: string;
  outputUrl: string;
  qualityScores: QualityScores;
}

interface JobFailedEvent {
  jobId: string;
  error: string;
}

export interface GenerationResult {
  outputUrl: string;
  qualityScores: QualityScores;
}

/* ------------------------------------------------------------------ */
/*  Public helpers                                                     */
/* ------------------------------------------------------------------ */

export function estimateCost(tier: GenerationTier, durationMs: number = 0): number {
  return TIER_CREDITS[tier] + durationMs * MS_RATE[tier];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useGeneration() {
  const {
    addJob,
    updateJobProgress,
    completeJob,
    failJob,
    cancelJob: storeCancelJob,
  } = useGenerationStore();

  const user = useAuthStore((s) => s.user);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<GenerationStage | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Cleanup --------------------------------------------------- */
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* ---- WebSocket subscription ------------------------------------ */
  const subscribe = useCallback(
    (jobId: string) => {
      const token = getToken();
      const ws = new WebSocket(`${WS_URL}?token=${token}&jobId=${jobId}`);
      wsRef.current = ws;

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'job:progress': {
              const payload = data.payload as JobProgressEvent;
              if (payload.jobId !== jobId) return;
              updateJobProgress(payload.jobId, payload.progress, payload.stage);
              setProgress(payload.progress);
              setStage(payload.stage);
              break;
            }

            case 'job:complete': {
              const payload = data.payload as JobCompleteEvent;
              if (payload.jobId !== jobId) return;
              completeJob(payload.jobId, payload.outputUrl);
              setProgress(100);
              setStage('complete');
              setResult({
                outputUrl: payload.outputUrl,
                qualityScores: payload.qualityScores,
              });
              setIsGenerating(false);
              if (timerRef.current) clearInterval(timerRef.current);
              ws.close();
              break;
            }

            case 'job:failed': {
              const payload = data.payload as JobFailedEvent;
              if (payload.jobId !== jobId) return;
              failJob(payload.jobId, payload.error);
              setError(payload.error);
              setStage('failed');
              setIsGenerating(false);
              if (timerRef.current) clearInterval(timerRef.current);
              ws.close();
              break;
            }
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.addEventListener('error', () => {
        setError('WebSocket connection error. Please try again.');
        setIsGenerating(false);
        if (timerRef.current) clearInterval(timerRef.current);
      });

      ws.addEventListener('close', () => {
        wsRef.current = null;
      });
    },
    [updateJobProgress, completeJob, failJob],
  );

  /* ---- Check balance --------------------------------------------- */
  const checkBalance = useCallback(async (): Promise<number> => {
    const userId = user?.id;
    if (!userId) throw new Error('Not authenticated');
    const res = await apiClient.get<BalanceResponse>(`/billing/credits/${userId}`);
    setBalance(res.credits);
    return res.credits;
  }, [user?.id]);

  /* ---- Generate -------------------------------------------------- */
  const generate = useCallback(
    async (shotId: string, tier: GenerationTier, sceneGraph?: SceneGraph) => {
      setIsGenerating(true);
      setProgress(0);
      setStage('queued');
      setResult(null);
      setError(null);
      elapsedRef.current = 0;

      try {
        const res = await apiClient.post<GenerateResponse>('/ai/v1/generate/video', {
          shotId,
          tier,
          sceneGraph,
        });

        const jobId = res.jobId;
        currentJobIdRef.current = jobId;

        addJob(jobId, { status: 'queued', progress: 0, stage: 'queued' });

        // Start elapsed-time counter
        timerRef.current = setInterval(() => {
          elapsedRef.current += 1;
        }, 1000);

        // Subscribe to real-time updates
        subscribe(jobId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Generation request failed';
        setError(message);
        setIsGenerating(false);
      }
    },
    [addJob, subscribe],
  );

  /* ---- Cancel ---------------------------------------------------- */
  const cancel = useCallback(
    async (jobId?: string) => {
      const targetId = jobId || currentJobIdRef.current;
      if (!targetId) return;

      try {
        await apiClient.post(`/ai/v1/jobs/${targetId}/cancel`);
        storeCancelJob(targetId);
        setIsGenerating(false);
        setStage(null);
        if (timerRef.current) clearInterval(timerRef.current);
        wsRef.current?.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to cancel job';
        setError(message);
      }
    },
    [storeCancelJob],
  );

  return {
    generate,
    cancel,
    isGenerating,
    progress,
    stage,
    result,
    error,
    balance,
    checkBalance,
    estimateCost,
    elapsedRef,
  };
}
