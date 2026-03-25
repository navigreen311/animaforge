import "dotenv/config";
import { createGenerationWorker } from "./workers/generationWorker.js";
import { createGovernanceWorker } from "./workers/governanceWorker.js";
import { createExportWorker } from "./workers/exportWorker.js";
import { createQcWorker } from "./workers/qcWorker.js";
import { createCleanupWorker, startCleanupScheduler } from "./workers/cleanupWorker.js";
import { allQueues } from "./queues/index.js";

async function main(): Promise<void> {
  console.log("[animaforge-workers] Starting BullMQ workers...");

  const generationWorker = createGenerationWorker();
  const governanceWorker = createGovernanceWorker();
  const exportWorker = createExportWorker();
  const qcWorker = createQcWorker();
  const cleanupWorker = createCleanupWorker();

  const qcWorker = createQcWorker();
  const cleanupWorker = createCleanupWorker();
  const workers = [generationWorker, governanceWorker, exportWorker, qcWorker, cleanupWorker];
  const cleanupInterval = await startCleanupScheduler();

  console.log("[animaforge-workers] All workers running.");
  console.log(
    "[animaforge-workers] Queues: " + allQueues.map((q) => q.name).join(", "),
  );

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[animaforge-workers] Received ${signal}, shutting down...`);

    clearInterval(cleanupInterval);
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all(allQueues.map((q) => q.close()));
    console.log("[animaforge-workers] All workers stopped. Exiting.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[animaforge-workers] Fatal error:", err);
  process.exit(1);
});
