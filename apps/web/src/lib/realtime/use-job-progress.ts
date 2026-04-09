"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./use-socket";

type JobStatus = "idle" | "running" | "complete" | "failed";

interface JobProgressState {
  /** Current progress percentage (0-100). */
  progress: number;
  /** Current pipeline stage label. */
  stage: string;
  /** Derived status based on received events. */
  status: JobStatus;
  /** Output URL set when job completes successfully. */
  outputUrl: string | null;
  /** Quality scores set when job completes successfully. */
  qualityScores: Record<string, number> | null;
  /** Error message if the job failed. */
  error: string | null;
}

const INITIAL_STATE: JobProgressState = {
  progress: 0,
  stage: "",
  status: "idle",
  outputUrl: null,
  qualityScores: null,
  error: null,
};

/**
 * Subscribe to job progress events for a specific job.
 *
 * Returns live progress, stage, status, and output information
 * that updates in realtime as the server emits job events.
 *
 * When `jobId` is undefined/null the hook stays inert.
 */
export function useJobProgress(jobId?: string | null): JobProgressState {
  const { subscribe } = useSocket();
  const [state, setState] = useState<JobProgressState>(INITIAL_STATE);

  // Reset when jobId changes
  useEffect(() => {
    setState(INITIAL_STATE);
  }, [jobId]);

  // Subscribe to job:progress
  useEffect(() => {
    if (!jobId) return;

    return subscribe<{
      jobId: string;
      progress: number;
      stage?: string;
      message?: string;
    }>("job:progress", (data) => {
      if (data.jobId !== jobId) return;
      setState((prev) => ({
        ...prev,
        progress: data.progress,
        stage: data.stage ?? prev.stage,
        status: "running",
      }));
    });
  }, [jobId, subscribe]);

  // Subscribe to job:complete
  useEffect(() => {
    if (!jobId) return;

    return subscribe<{
      jobId: string;
      outputUrl: string;
      qualityScores?: Record<string, number>;
    }>("job:complete", (data) => {
      if (data.jobId !== jobId) return;
      setState((prev) => ({
        ...prev,
        progress: 100,
        status: "complete",
        outputUrl: data.outputUrl,
        qualityScores: data.qualityScores ?? null,
      }));
    });
  }, [jobId, subscribe]);

  // Subscribe to job:failed
  useEffect(() => {
    if (!jobId) return;

    return subscribe<{
      jobId: string;
      error: string;
      reason?: string;
    }>("job:failed", (data) => {
      if (data.jobId !== jobId) return;
      setState((prev) => ({
        ...prev,
        status: "failed",
        error: data.error,
      }));
    });
  }, [jobId, subscribe]);

  return state;
}
