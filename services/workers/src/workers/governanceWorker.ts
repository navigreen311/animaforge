import { Worker, Job } from "bullmq";
import { redisConnection } from "../queues/index.js";
import {
  StageDefinition,
  calculateProgress,
  updateJobStatus,
  simulateWork,
} from "../utils/jobHelpers.js";

/* ---------- Pipeline stages (4 stages) ---------- */

const GOVERNANCE_STAGES: StageDefinition[] = [
  { name: "content_scan", weight: 30 },
  { name: "policy_check", weight: 25 },
  { name: "rights_verification", weight: 25 },
  { name: "approval_gate", weight: 20 },
];

interface GovernanceJobData {
  asset_url: string;
  project_id: string;
  user_id: string;
  policies: string[];
}

interface GovernanceResult {
  approved: boolean;
  flags: string[];
  confidence: number;
  reviewed_at: string;
}

/* ---------- Processor ---------- */

async function processGovernance(job: Job<GovernanceJobData>): Promise<GovernanceResult> {
  await updateJobStatus(job, "init", "queued", 0);

  const flags: string[] = [];

  for (let i = 0; i < GOVERNANCE_STAGES.length; i++) {
    const stage = GOVERNANCE_STAGES[i];
    const progress = calculateProgress(GOVERNANCE_STAGES, i);

    await updateJobStatus(job, stage.name, "running", progress);
    await simulateWork(stage.weight * 10);

    // Simulate occasional flags
    if (stage.name === "content_scan" && Math.random() > 0.85) {
      flags.push("potential_nsfw_content");
    }
    if (stage.name === "rights_verification" && Math.random() > 0.9) {
      flags.push("unverified_asset_origin");
    }
  }

  const result: GovernanceResult = {
    approved: flags.length === 0,
    flags,
    confidence: +(0.90 + Math.random() * 0.09).toFixed(3),
    reviewed_at: new Date().toISOString(),
  };

  await updateJobStatus(job, "done", "complete", 100);
  return result;
}

/* ---------- Worker factory ---------- */

export function createGovernanceWorker(concurrency = 5): Worker<GovernanceJobData, GovernanceResult> {
  const worker = new Worker<GovernanceJobData, GovernanceResult>(
    "governance",
    processGovernance,
    {
      connection: redisConnection,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[governance] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[governance] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
