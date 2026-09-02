import 'dotenv/config';
import { createGenerationWorker } from './workers/generationWorker.js';
import { createGovernanceWorker } from './workers/governanceWorker.js';
import { createExportWorker } from './workers/exportWorker.js';
import { createQcWorker } from './workers/qcWorker.js';
import { createCleanupWorker, startCleanupScheduler } from './workers/cleanupWorker.js';
import { allQueues } from './queues/index.js';
import {
  ComplianceIdentityError,
  isComplianceScannerConfigured,
  verifyComplianceIdentity,
} from './utils/complianceClient.js';

/**
 * Confirm the marketing compliance identity before starting any worker.
 *
 * The render gate fails closed, so a COMPLIANCE_SCAN_ADVISOR_ID that resolves
 * to nobody does not let unchecked videos through — it stops renders. That is
 * the safe direction and the quiet one: the queue backs up, and nothing says
 * why until somebody reads a worker log. CapitalForge enforces the id since
 * 2026-09-01, where it previously accepted any UUID, so a deployment that was
 * working on a made-up id will stop the first time it tries to render.
 *
 * Refusing to boot is the loud version of the same failure, and it happens
 * where an operator is already looking.
 *
 * NOT symmetrical, deliberately:
 *
 *   identity rejected  -> exit. It will not fix itself.
 *   scanner unreachable -> warn and continue. A CapitalForge that is down at
 *                          boot may be up in a minute, and refusing to start
 *                          the whole worker fleet — export, QC, cleanup — over
 *                          a transient outage in one dependency is a bigger
 *                          outage than the one being prevented.
 *   not configured      -> warn and continue. Renders will refuse per job,
 *                          which is already loud where it matters, and a
 *                          deployment that never renders should still run.
 */
async function verifyComplianceIdentityOrExit(): Promise<void> {
  if (!isComplianceScannerConfigured()) {
    console.warn(
      '[animaforge-workers] Marketing compliance scanner is NOT configured. '
      + 'Every render will be refused (the gate fails closed). Set '
      + 'COMPLIANCE_SCAN_URL, COMPLIANCE_SCAN_TOKEN and COMPLIANCE_SCAN_ADVISOR_ID.',
    );
    return;
  }

  try {
    await verifyComplianceIdentity();
    console.log('[animaforge-workers] Marketing compliance identity verified.');
  } catch (err) {
    if (err instanceof ComplianceIdentityError) {
      console.error(`[animaforge-workers] ${err.message}`);
      console.error(
        '[animaforge-workers] Refusing to start. Check COMPLIANCE_SCAN_ADVISOR_ID names '
        + 'a user that exists in the same tenant as COMPLIANCE_SCAN_TOKEN.',
      );
      process.exit(1);
    }
    console.warn(
      '[animaforge-workers] Could not verify the marketing compliance identity: '
      + `${err instanceof Error ? err.message : String(err)}. `
      + 'Starting anyway — the render gate refuses per job while the scanner is '
      + 'unreachable, so nothing renders unchecked.',
    );
  }
}

async function main(): Promise<void> {
  console.log('[animaforge-workers] Starting BullMQ workers...');

  // Before any worker picks up a job.
  await verifyComplianceIdentityOrExit();

  const generationWorker = createGenerationWorker();
  const governanceWorker = createGovernanceWorker();
  const exportWorker = createExportWorker();
  const qcWorker = createQcWorker();
  const cleanupWorker = createCleanupWorker();

  const workers = [generationWorker, governanceWorker, exportWorker, qcWorker, cleanupWorker];

  const cleanupInterval = await startCleanupScheduler();

  console.log('[animaforge-workers] All workers running.');
  console.log('[animaforge-workers] Queues: ' + allQueues.map((q) => q.name).join(', '));

  const shutdown = async (signal: string): Promise<void> => {
    console.log('\n[animaforge-workers] Received ' + signal + ', shutting down...');
    clearInterval(cleanupInterval);
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all(allQueues.map((q) => q.close()));
    console.log('[animaforge-workers] All workers stopped. Exiting.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[animaforge-workers] Fatal error:', err);
  process.exit(1);
});
