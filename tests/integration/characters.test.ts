/**
 * Integration tests — Characters API
 *
 * Tests the /api/v1/characters endpoints against the platform-api Express app,
 * covering CRUD, digital twin triggering, project filtering, and consent validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  prisma,
  createTestUser,
  createTestProject,
  createTestCharacter,
  getPlatformToken,
  apiRequest,
} from './helpers';
import { clearCharacters } from '../../services/platform-api/src/services/characterService.js';
import { clearStore as clearConsentStore } from '../../services/governance/consent/src/services/consentService';

// Reset stores before each test
beforeEach(() => {
  clearCharacters();
  clearConsentStore();
});

describe('Characters API', () => {
  // 1. Create character -> stored in DB
  it('should create a character and store it', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const project = await createTestProject(user.id);

    const res = await apiRequest('post', '/api/v1/characters', {
      name: 'Hero Alpha',
      projectId: project.id,
      styleMode: 'realistic',
      isDigitalTwin: false,
    }, token);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Resolve in case data is a promise (in-memory returns sync, prisma async)
    const data = await res.body.data;
    expect(data.name).toBe('Hero Alpha');
    expect(data.styleMode).toBe('realistic');
    expect(data.id).toBeDefined();
  });

  // 2. Update style mode -> field updated
  it('should update a character style mode', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const project = await createTestProject(user.id);

    const createRes = await apiRequest('post', '/api/v1/characters', {
      name: 'Morph Character',
      projectId: project.id,
      styleMode: 'realistic',
    }, token);

    const charId = (await createRes.body.data).id;

    const res = await apiRequest('put', `/api/v1/characters/${charId}`, {
      styleMode: 'anime',
    }, token);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = await res.body.data;
    expect(data.styleMode).toBe('anime');
  });

  // 3. Trigger digital twin -> job created
  it('should trigger a digital twin job for a character', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const project = await createTestProject(user.id);

    const createRes = await apiRequest('post', '/api/v1/characters', {
      name: 'Twin Candidate',
      projectId: project.id,
      styleMode: 'realistic',
    }, token);

    const charId = (await createRes.body.data).id;

    const res = await apiRequest('post', `/api/v1/characters/${charId}/twin`, undefined, token);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job_id).toBeDefined();
  });

  // 4. List by project -> filtered correctly
  it('should list characters filtered by project', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const projectA = await createTestProject(user.id, { title: 'Project A' });
    const projectB = await createTestProject(user.id, { title: 'Project B' });

    // Create 2 characters in project A, 1 in project B
    await apiRequest('post', '/api/v1/characters', {
      name: 'Char A1',
      projectId: projectA.id,
      styleMode: 'anime',
    }, token);
    await apiRequest('post', '/api/v1/characters', {
      name: 'Char A2',
      projectId: projectA.id,
      styleMode: 'cartoon',
    }, token);
    await apiRequest('post', '/api/v1/characters', {
      name: 'Char B1',
      projectId: projectB.id,
      styleMode: 'cel',
    }, token);

    const res = await apiRequest(
      'get',
      `/api/v1/characters?projectId=${projectA.id}`,
      undefined,
      token,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = await res.body.data;
    expect(data.total).toBe(2);
    for (const item of data.items) {
      const resolved = await item;
      expect(resolved.projectId).toBe(projectA.id);
    }
  });

  // 5. Delete character -> removed from list
  it('should delete a character and remove it from listing', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const project = await createTestProject(user.id);

    const createRes = await apiRequest('post', '/api/v1/characters', {
      name: 'Expendable',
      projectId: project.id,
      styleMode: 'pixel',
    }, token);

    const charId = (await createRes.body.data).id;

    const deleteRes = await apiRequest('delete', `/api/v1/characters/${charId}`, undefined, token);
    expect(deleteRes.status).toBe(204);

    // Verify it is gone
    const getRes = await apiRequest('get', `/api/v1/characters/${charId}`, undefined, token);
    expect(getRes.status).toBe(404);
  });

  // 6. Character with consent -> consent validated on generation
  it('should validate consent for a character before generation', async () => {
    const user = await createTestUser();
    const token = getPlatformToken(user.id, { email: user.email });
    const project = await createTestProject(user.id);

    // Create a character
    const createRes = await apiRequest('post', '/api/v1/characters', {
      name: 'Consent Character',
      projectId: project.id,
      styleMode: 'realistic',
      isDigitalTwin: true,
    }, token);

    const charId = (await createRes.body.data).id;

    // Grant consent for this character via the consent service
    let consentApp: any;
    const consentMod = await import('../../services/governance/consent/src/index');
    consentApp = (consentMod as any).app ?? consentMod.default;

    await request(consentApp)
      .post('/api/v1/rights/consent')
      .send({
        subject_id: charId,
        granted_by: user.id,
        consent_type: 'likeness',
        scope: ['generation'],
        expires_at: null,
      });

    // Validate consent
    const validateRes = await request(consentApp)
      .post('/governance/consent/validate')
      .send({
        character_refs: [charId],
        consent_types_needed: ['likeness'],
      });

    expect(validateRes.status).toBe(200);
    expect(validateRes.body.valid).toBe(true);
    expect(validateRes.body.missing_consents).toHaveLength(0);
  });
});
