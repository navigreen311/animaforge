import { v4 as uuidv4 } from "uuid";

export interface OnboardingStep {
  id: string;
  title: string;
  completedAt: string | null;
}

export interface OnboardingRecord {
  onboardingId: string;
  userId: string;
  steps: OnboardingStep[];
  currentStep: number;
  createdAt: string;
}

const STEPS: Array<{ id: string; title: string }> = [
  { id: "welcome", title: "Welcome" },
  { id: "role", title: "Choose Role" },
  { id: "first_project", title: "Create Project" },
  { id: "first_generation", title: "Generate" },
  { id: "tour_complete", title: "Tour" },
];

// In-memory store
const store: Map<string, OnboardingRecord> = new Map();

export function resetStore(): void {
  store.clear();
}

export function startOnboarding(userId: string): {
  onboardingId: string;
  steps: OnboardingStep[];
  currentStep: number;
} {
  const existing = getRecordByUser(userId);
  if (existing) {
    return {
      onboardingId: existing.onboardingId,
      steps: existing.steps,
      currentStep: existing.currentStep,
    };
  }

  const onboardingId = uuidv4();
  const steps: OnboardingStep[] = STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    completedAt: null,
  }));

  const record: OnboardingRecord = {
    onboardingId,
    userId,
    steps,
    currentStep: 0,
    createdAt: new Date().toISOString(),
  };

  store.set(userId, record);

  return { onboardingId, steps, currentStep: 0 };
}

export function completeStep(
  userId: string,
  stepId: string,
): { success: boolean; currentStep: number; completedSteps: string[] } {
  const record = getRecordByUser(userId);
  if (!record) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      "Onboarding not started",
    );
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const stepIndex = record.steps.findIndex((s) => s.id === stepId);
  if (stepIndex === -1) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      `Unknown step: ${stepId}`,
    );
    err.statusCode = 400;
    err.code = "INVALID_STEP";
    throw err;
  }

  if (!record.steps[stepIndex].completedAt) {
    record.steps[stepIndex].completedAt = new Date().toISOString();
  }

  // Advance currentStep to next incomplete step
  const nextIncomplete = record.steps.findIndex((s) => !s.completedAt);
  record.currentStep = nextIncomplete === -1 ? record.steps.length : nextIncomplete;

  const completedSteps = record.steps
    .filter((s) => s.completedAt)
    .map((s) => s.id);

  return { success: true, currentStep: record.currentStep, completedSteps };
}

export function getProgress(userId: string): {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  completedSteps: string[];
} {
  const record = getRecordByUser(userId);
  if (!record) {
    return { currentStep: 0, totalSteps: 5, percentage: 0, completedSteps: [] };
  }

  const completedSteps = record.steps
    .filter((s) => s.completedAt)
    .map((s) => s.id);

  return {
    currentStep: record.currentStep,
    totalSteps: 5,
    percentage: Math.round((completedSteps.length / 5) * 100),
    completedSteps,
  };
}

export function skipOnboarding(userId: string): { skipped: boolean } {
  let record = getRecordByUser(userId);
  if (!record) {
    startOnboarding(userId);
    record = getRecordByUser(userId)!;
  }

  const now = new Date().toISOString();
  for (const step of record.steps) {
    if (!step.completedAt) {
      step.completedAt = now;
    }
  }
  record.currentStep = record.steps.length;

  return { skipped: true };
}

export function isOnboardingComplete(userId: string): boolean {
  const record = getRecordByUser(userId);
  if (!record) return false;
  return record.steps.every((s) => s.completedAt !== null);
}

function getRecordByUser(userId: string): OnboardingRecord | undefined {
  return store.get(userId);
}
