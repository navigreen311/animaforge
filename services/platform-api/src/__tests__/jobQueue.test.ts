import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import productionRouter from '../routes/console/production.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { signTestToken } from './fixtures/tokens.js';
import {
  resetFixtures,
  seedProject,
  seedTestUser,
  seedUser,
  TEST_USER_ID,
} from './fixtures/factories.js';
import { requirePrisma } from '../db.js';

/**
 * Submit → queued → visible (#80).
 *
 * The generation pipeline had a consumer and no producer: `queues/index.ts`
 * declared the queues and `generationWorker.ts` consumed them, but nothing in
 * the repository ever called `generationQueue.add()`, so a job could not be
 * started from anywhere and /render-queue was permanently empty.
 *
 * These tests cover the producer half — the row is written, the work is queued
 * under the row's id, ownership is enforced, and a queue outage is reported
 * rather than leaving a job sitting at `queued` forever. Redis is stubbed:
 * these assert on what platform-api does, and a live Redis is not available in
 * the API test job.
 */

const enqueueSpy = vi.fn<(input: Record<string, unknown>) => Promise<void>>();

vi.mock('../lib/generationQueue.js', () => ({
  enqueueGeneration: (input: Record<string, unknown>) => enqueueSpy(input),
  closeGenerationQueue: async () => {},
  GENERATION_QUEUE_NAME: 'generation',
}));

const app = express();
app.use(express.json());
app.use('/api/v1', productionRouter);
app.use(errorHandler);

const AUTH = { Authorization: `Bearer ${signTestToken({ sub: TEST_USER_ID })}` };

beforeEach(async () => {
  enqueueSpy.mockReset();
  enqueueSpy.mockResolvedValue(undefined);
  await resetFixtures();
  await seedTestUser();
});

afterAll(async () => {
  vi.restoreAllMocks();
});

describe('POST /api/v1/jobs', () => {
  it('records the job as queued and puts it on the queue', async () => {
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'video', projectId: project.id, params: { prompt: 'a wide shot' } });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('queued');
    expect(res.body.data.jobType).toBe('video');
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
  });

  it('queues the job under the id of the row it just wrote', async () => {
    // This is what keeps the console's view and the queue's view of a job in
    // one place: the worker's status writes land on the row already displayed.
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'audio', projectId: project.id, params: {} });

    expect(enqueueSpy.mock.calls[0][0]).toMatchObject({ jobId: res.body.data.id });
  });

  it('sends the payload shape the worker destructures', async () => {
    // generationWorker.ts reads { type, project_id, user_id, params, tier }.
    // Renaming a field on either side breaks the pipeline silently — the job
    // is accepted and then fails inside the worker — so the shape is pinned.
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'video', projectId: project.id, params: { prompt: 'x' }, tier: 'pro' });

    expect(enqueueSpy.mock.calls[0][0]).toMatchObject({
      type: 'video',
      projectId: project.id,
      userId: TEST_USER_ID,
      params: { prompt: 'x' },
      tier: 'pro',
    });
  });

  it('makes the job visible to the queue listing straight away', async () => {
    // Written before the enqueue on purpose: a deployment with no worker
    // running should show a queue that is filling up, which is true, not one
    // that looks empty.
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'video', projectId: project.id, params: {} });

    const list = await request(app).get('/api/v1/jobs').set(AUTH);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].status).toBe('queued');
  });

  it('refuses to queue work against a project the caller does not own', async () => {
    const stranger = await seedUser({
      id: '00000000-0000-4000-8000-00000000beef',
      email: 'stranger@animaforge.test',
    });
    const { project } = await seedProject({ ownerId: stranger });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'video', projectId: project.id, params: {} });

    expect(res.status).toBe(404);
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated submission', async () => {
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post('/api/v1/jobs')
      .send({ type: 'video', projectId: project.id, params: {} });

    expect(res.status).toBe(401);
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('rejects an unknown generation type', async () => {
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'telepathy', projectId: project.id, params: {} });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('reports a queue outage instead of leaving the job stuck at queued', async () => {
    // A row at `queued` reads as "waiting its turn". If the enqueue failed,
    // nothing will ever run it, and saying so is the whole point.
    enqueueSpy.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:6379'));
    const { project } = await seedProject({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(AUTH)
      .send({ type: 'video', projectId: project.id, params: {} });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('QUEUE_UNAVAILABLE');

    const list = await request(app).get('/api/v1/jobs').set(AUTH);
    const job = list.body.data.items[0];
    expect(job.status).toBe('failed');
    expect(job.errorReason).toContain('Could not be queued');
  });
});

describe('POST /api/v1/jobs/:id/retry', () => {
  it('queues the retry rather than only recording it', async () => {
    // Retry created a row and stopped, so a "retried" job sat at queued and
    // never ran again.
    const { project } = await seedProject({ ownerId: TEST_USER_ID });
    const original = await requirePrisma().generationJob.create({
      data: {
        projectId: project.id,
        userId: TEST_USER_ID,
        jobType: 'video',
        modelId: 'default',
        inputParams: {},
        tier: 'preview',
        status: 'failed',
      },
    });

    const res = await request(app).post(`/api/v1/jobs/${original.id}/retry`).set(AUTH);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('queued');
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy.mock.calls[0][0]).toMatchObject({ jobId: res.body.data.id });
  });
});
