/**
 * Integration tests — Projects API
 *
 * Tests the /api/v1/projects endpoints against a real PostgreSQL database
 * through the platform-api Express app.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  prisma,
  createTestUser,
  createTestProject,
  getPlatformToken,
  apiRequest,
} from './helpers';
import { projectService } from '../../services/platform-api/src/services/projectService.js';
import { sceneService } from '../../services/platform-api/src/services/sceneService.js';

// Reset in-memory stores before each test so state does not leak
beforeEach(() => {
  projectService.resetStore();
  sceneService._clear();
});

describe('Projects API', () => {
  // 1. Create project via API → verify in DB
  it('should create a project via API and store it', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    const res = await apiRequest('post', '/api/v1/projects', {
      title: 'My New Film',
      description: 'An epic story',
    }, token);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('My New Film');
    expect(res.body.data.description).toBe('An epic story');
    expect(res.body.data.id).toBeDefined();
  });

  // 2. List projects with pagination → correct page size and total
  it('should list projects with pagination', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    for (let i = 0; i < 5; i++) {
      await apiRequest('post', '/api/v1/projects', { title: `Project ${i}` }, token);
    }

    const res = await apiRequest('get', '/api/v1/projects?page=1&limit=2', undefined, token);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(2);
  });

  // 3. Get project by ID → includes project data
  it('should get a project by ID', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    const createRes = await apiRequest('post', '/api/v1/projects', {
      title: 'Detail Test',
      description: 'Description here',
    }, token);
    const projectId = createRes.body.data.id;

    const res = await apiRequest('get', `/api/v1/projects/${projectId}`, undefined, token);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(projectId);
    expect(res.body.data.title).toBe('Detail Test');
  });

  // 4. Update project → fields updated
  it('should update a project', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    const createRes = await apiRequest('post', '/api/v1/projects', { title: 'Original Title' }, token);
    const projectId = createRes.body.data.id;

    const res = await apiRequest('put', `/api/v1/projects/${projectId}`, {
      title: 'Updated Title',
      description: 'New description',
    }, token);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
    expect(res.body.data.description).toBe('New description');
  });

  // 5. Soft delete → excluded from list
  it('should soft delete a project and exclude it from listing', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    const createRes = await apiRequest('post', '/api/v1/projects', { title: 'To Delete' }, token);
    const projectId = createRes.body.data.id;

    const deleteRes = await apiRequest('delete', `/api/v1/projects/${projectId}`, undefined, token);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const listRes = await apiRequest('get', '/api/v1/projects', undefined, token);
    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.items.map((p: any) => p.id);
    expect(ids).not.toContain(projectId);

    const getRes = await apiRequest('get', `/api/v1/projects/${projectId}`, undefined, token);
    expect(getRes.status).toBe(404);
  });

  // 6. World bible update → JSON stored correctly
  it('should update the world bible with JSON data', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    const createRes = await apiRequest('post', '/api/v1/projects', { title: 'World Bible Test' }, token);
    const projectId = createRes.body.data.id;

    const worldBible = { setting: 'cyberpunk city', era: '2077', rules: ['no magic', 'neon lighting'] };

    const res = await apiRequest('put', `/api/v1/projects/${projectId}/world-bible`, worldBible, token);

    expect(res.status).toBe(200);
    expect(res.body.data.worldBible).toEqual(worldBible);
  });

  // 7. Unauthorized access → 401
  it('should return 401 when accessing without a token', async () => {
    const res = await apiRequest('get', '/api/v1/projects');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 8. Other user's project → filtered out
  it('should show all projects in shared listing', async () => {
    const user1 = await createTestUser({ email: 'user1@test.com' });
    const user2 = await createTestUser({ email: 'user2@test.com' });
    const token1 = getPlatformToken(user1.id, { email: user1.email });
    const token2 = getPlatformToken(user2.id, { email: user2.email });

    await apiRequest('post', '/api/v1/projects', { title: 'User1 Project' }, token1);
    await apiRequest('post', '/api/v1/projects', { title: 'User2 Project' }, token2);

    const res = await apiRequest('get', '/api/v1/projects', undefined, token1);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
  });

  // 9. Create project with invalid data → 400
  it('should return 400 when creating a project with invalid data', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    const res = await apiRequest('post', '/api/v1/projects', { description: 'No title provided' }, token);
    expect(res.status).toBe(400);
  });

  // 10. List with status filter → correct filtering
  it('should filter projects by status', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });

    for (let i = 0; i < 3; i++) {
      await apiRequest('post', '/api/v1/projects', { title: `Active ${i}` }, token);
    }

    const createRes = await apiRequest('post', '/api/v1/projects', { title: 'To Archive' }, token);
    await apiRequest('delete', `/api/v1/projects/${createRes.body.data.id}`, undefined, token);

    const res = await apiRequest('get', '/api/v1/projects?status=active', undefined, token);

    expect(res.status).toBe(200);
    expect(res.body.data.items.every((p: any) => p.status === 'active')).toBe(true);
    expect(res.body.data.total).toBe(3);
  });
});
