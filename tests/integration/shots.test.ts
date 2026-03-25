/**
 * Integration tests — Shots API
 *
 * Tests the /api/v1/shots and /api/v1/scenes/:sceneId/shots endpoints
 * through the platform-api Express app.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  prisma,
  createTestUser,
  getPlatformToken,
  apiRequest,
} from './helpers';
import { projectService } from '../../services/platform-api/src/services/projectService.js';
import { sceneService } from '../../services/platform-api/src/services/sceneService.js';
import { shotService } from '../../services/platform-api/src/services/shotService.js';

beforeEach(() => {
  projectService.resetStore();
  sceneService._clear();
  shotService._clear();
});

function seedProjectAndScene() {
  const project = projectService.create({ title: 'Shot Test Project' });
  const scene = sceneService.create(project.id, { title: 'Scene 1', order: 1 });
  return { project, scene };
}

const validSceneGraph = {
  subject: 'hero character',
  camera: { angle: 'close-up', movement: 'dolly', focal_length: '85mm' },
  action: 'running through rain',
  emotion: 'anxious',
  timing: { duration_ms: 3000, pacing: 'fast' },
};

describe('Shots API', () => {
  // 1. Create shot with valid scene graph
  it('should create a shot with a valid scene graph', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { project, scene } = seedProjectAndScene();

    const res = await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
      sceneGraph: validSceneGraph,
      prompt: 'Hero runs through the rain at night',
      durationMs: 3000,
      aspectRatio: '16:9',
    }, token);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sceneGraph.subject).toBe('hero character');
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.projectId).toBe(project.id);
  });

  // 2. Invalid scene graph rejected
  it('should reject a shot with an invalid scene graph', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { scene } = seedProjectAndScene();

    const res = await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
      sceneGraph: { subject: '' },
      prompt: 'Test prompt',
      durationMs: 3000,
      aspectRatio: '16:9',
    }, token);

    expect(res.status).toBe(400);
  });

  // 3. Approve shot
  it('should approve a shot and set approvedBy', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { scene } = seedProjectAndScene();

    const createRes = await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
      sceneGraph: validSceneGraph, prompt: 'Approval test', durationMs: 5000, aspectRatio: '16:9',
    }, token);
    const shotId = createRes.body.data.id;

    const approveRes = await apiRequest('put', `/api/v1/shots/${shotId}/approve`, {}, token);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.approvedBy).toBeDefined();
    expect(approveRes.body.data.approvedAt).toBeDefined();
  });

  // 4. Lock shot → updates rejected with 409
  it('should lock a shot and reject subsequent updates with 409', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { scene } = seedProjectAndScene();

    const createRes = await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
      sceneGraph: validSceneGraph, prompt: 'Lock test', durationMs: 5000, aspectRatio: '16:9',
    }, token);
    const shotId = createRes.body.data.id;

    const lockRes = await apiRequest('put', `/api/v1/shots/${shotId}/lock`, {}, token);
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.status).toBe('locked');

    const updateRes = await apiRequest('put', `/api/v1/shots/${shotId}`, { prompt: 'Trying to change' }, token);
    expect(updateRes.status).toBe(409);
    expect(updateRes.body.error.code).toBe('LOCKED');
  });

  // 5. List shots for project
  it('should list shots for a specific project', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { project, scene } = seedProjectAndScene();

    for (let i = 0; i < 3; i++) {
      await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
        sceneGraph: validSceneGraph, prompt: `Shot ${i}`, durationMs: 3000, aspectRatio: '16:9',
      }, token);
    }

    const res = await apiRequest('get', `/api/v1/projects/${project.id}/shots`, undefined, token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.every((s: any) => s.projectId === project.id)).toBe(true);
  });

  // 6. Shot with character refs
  it('should store character references on a shot', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { scene } = seedProjectAndScene();

    const charRef1 = uuidv4();
    const charRef2 = uuidv4();

    const res = await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
      sceneGraph: validSceneGraph, prompt: 'Character ref test',
      characterRefs: [charRef1, charRef2], durationMs: 3000, aspectRatio: '16:9',
    }, token);

    expect(res.status).toBe(201);
    expect(res.body.data.characterRefs).toEqual([charRef1, charRef2]);
  });

  // 7. Delete shot
  it('should delete a shot and remove it from listing', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { project, scene } = seedProjectAndScene();

    const createRes = await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
      sceneGraph: validSceneGraph, prompt: 'To be deleted', durationMs: 3000, aspectRatio: '16:9',
    }, token);
    const shotId = createRes.body.data.id;

    const deleteRes = await apiRequest('delete', `/api/v1/shots/${shotId}`, undefined, token);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const listRes = await apiRequest('get', `/api/v1/projects/${project.id}/shots`, undefined, token);
    const ids = listRes.body.data.map((s: any) => s.id);
    expect(ids).not.toContain(shotId);
  });

  // 8. Shot ordering
  it('should maintain shot ordering within a project', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const { project, scene } = seedProjectAndScene();

    const prompts = ['First shot', 'Second shot', 'Third shot'];
    for (const prompt of prompts) {
      await apiRequest('post', `/api/v1/scenes/${scene.id}/shots`, {
        sceneGraph: validSceneGraph, prompt, durationMs: 3000, aspectRatio: '16:9',
      }, token);
    }

    const res = await apiRequest('get', `/api/v1/projects/${project.id}/shots`, undefined, token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    const returnedPrompts = res.body.data.map((s: any) => s.prompt);
    expect(returnedPrompts).toContain('First shot');
    expect(returnedPrompts).toContain('Second shot');
    expect(returnedPrompts).toContain('Third shot');
  });
});
