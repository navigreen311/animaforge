/**
 * Integration tests — Generation & Billing & Governance
 *
 * Tests generation job lifecycle including credit deduction,
 * job status tracking, and governance pipeline moderation logging.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  prisma,
  createTestUser,
  createTestProject,
  createTestScene,
  createTestShot,
  billingRequest,
  moderationRequest,
} from './helpers';
import { _resetStores as resetBillingStores } from '../../services/billing/src/services/billingService';
import { _resetLogStore as resetModerationLogs } from '../../services/governance/moderation/src/services/moderationService';

beforeEach(() => {
  resetBillingStores();
  resetModerationLogs();
});

describe('Generation Jobs', () => {
  // 1. Submit generation job → queued status
  it('should create a generation job in the database with queued status', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    const scene = await createTestScene(project.id);
    const shot = await createTestShot(scene.id, project.id);

    const job = await prisma.generationJob.create({
      data: {
        shotId: shot.id, projectId: project.id, userId: user.id,
        jobType: 'video_10s_preview', modelId: 'animaforge-v1',
        inputParams: { prompt: 'Hero running', style: 'cinematic' },
        status: 'queued', tier: 'preview', progress: 0,
      },
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe('queued');
    expect(job.progress).toBe(0);

    const dbJob = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(dbJob).not.toBeNull();
    expect(dbJob!.status).toBe('queued');
    expect(dbJob!.jobType).toBe('video_10s_preview');
  });

  // 2. Get job status → returns progress
  it('should track job progress in the database', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id, userId: user.id,
        jobType: 'video_10s_final', modelId: 'animaforge-v1',
        inputParams: {}, status: 'processing', progress: 45,
      },
    });

    await prisma.generationJob.update({ where: { id: job.id }, data: { progress: 75 } });

    const updated = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(updated!.progress).toBe(75);
    expect(updated!.status).toBe('processing');
  });

  // 3. Credit deduction → balance decremented
  it('should deduct credits when a job is submitted', async () => {
    const userId = uuidv4();

    const topUpRes = await billingRequest('post', '/billing/credits/topup', { userId, amount: 100 });
    expect(topUpRes.status).toBe(200);
    expect(topUpRes.body.balance).toBe(100);

    await billingRequest('post', '/billing/subscribe', { userId, tier: 'pro' });

    const deductRes = await billingRequest('post', '/billing/credits/deduct', {
      userId, jobType: 'video_10s_preview', tier: 'pro',
    });

    expect(deductRes.status).toBe(200);
    expect(deductRes.body.balance).toBe(99);

    const balRes = await billingRequest('get', `/billing/credits/${userId}`);
    expect(balRes.status).toBe(200);
    expect(balRes.body.balance).toBe(99);
  });

  // 4. Insufficient credits → 402
  it('should return 402 when credits are insufficient', async () => {
    const userId = uuidv4();

    await billingRequest('post', '/billing/subscribe', { userId, tier: 'free' });

    const res = await billingRequest('post', '/billing/credits/deduct', {
      userId, jobType: 'video_10s_final', tier: 'free',
    });

    expect(res.status).toBe(402);
    expect(res.body.error).toContain('Insufficient credits');
  });

  // 5. Job completion → status='complete', output_url set
  it('should mark a job as complete with output URL', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id, userId: user.id,
        jobType: 'video_10s_final', modelId: 'animaforge-v1',
        inputParams: { prompt: 'Final render' }, status: 'processing', progress: 90,
      },
    });

    const completed = await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'complete', progress: 100,
        outputUrl: 'https://cdn.animaforge.io/renders/output-abc123.mp4',
        completedAt: new Date(),
      },
    });

    expect(completed.status).toBe('complete');
    expect(completed.progress).toBe(100);
    expect(completed.outputUrl).toBe('https://cdn.animaforge.io/renders/output-abc123.mp4');
    expect(completed.completedAt).not.toBeNull();
  });

  // 6. Governance pipeline runs → moderation log created
  it('should create a moderation log entry when governance pipeline runs', async () => {
    const jobId = uuidv4();

    const moderateRes = await moderationRequest('post', '/governance/moderate', {
      job_id: jobId,
      content_url: 'https://cdn.animaforge.io/renders/safe-content.mp4',
      content_type: 'video',
    });

    expect(moderateRes.status).toBe(200);
    expect(moderateRes.body.result).toBe('pass');
    expect(moderateRes.body.category).toBe('safe');

    const logRes = await moderationRequest('get', `/governance/moderation-log/${jobId}`);

    expect(logRes.status).toBe(200);
    expect(logRes.body).toHaveLength(1);
    expect(logRes.body[0].job_id).toBe(jobId);
    expect(logRes.body[0].result).toBe('pass');

    const flaggedJobId = uuidv4();
    const flagRes = await moderationRequest('post', '/governance/moderate', {
      job_id: flaggedJobId,
      content_url: 'https://cdn.animaforge.io/renders/kill-blood-scene.mp4',
      content_type: 'video',
    });

    expect(flagRes.status).toBe(200);
    expect(['flag', 'block']).toContain(flagRes.body.result);
    expect(flagRes.body.category).toBe('violence');
  });
});
