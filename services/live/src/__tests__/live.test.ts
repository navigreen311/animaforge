import request from 'supertest';
import { app } from '../index';
import { clearSessions } from '../services/liveService';

afterEach(() => {
  clearSessions();
});

describe('Live Runtime Service', () => {
  test('POST /live/session — creates a new live session', async () => {
    const res = await request(app)
      .post('/live/session')
      .send({ projectId: 'proj-1', avatarId: 'avatar-1', mode: 'interactive' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.projectId).toBe('proj-1');
    expect(res.body.avatarId).toBe('avatar-1');
    expect(res.body.mode).toBe('interactive');
    expect(res.body.status).toBe('created');
  });

  test('PUT /live/session/:id/start — starts streaming', async () => {
    const create = await request(app)
      .post('/live/session')
      .send({ projectId: 'proj-1', avatarId: 'avatar-1', mode: 'broadcast' });

    const res = await request(app).put(`/live/session/${create.body.id}/start`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('streaming');
    expect(res.body.startedAt).toBeTruthy();
  });

  test('PUT /live/session/:id/stop — stops streaming', async () => {
    const create = await request(app)
      .post('/live/session')
      .send({ projectId: 'proj-1', avatarId: 'avatar-1', mode: 'interactive' });

    await request(app).put(`/live/session/${create.body.id}/start`);
    const res = await request(app).put(`/live/session/${create.body.id}/stop`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('stopped');
    expect(res.body.stoppedAt).toBeTruthy();
  });

  test('GET /live/session/:id — returns session status', async () => {
    const create = await request(app)
      .post('/live/session')
      .send({ projectId: 'proj-2', avatarId: 'avatar-2', mode: 'rehearsal' });

    const res = await request(app).get(`/live/session/${create.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(create.body.id);
    expect(res.body.mode).toBe('rehearsal');
  });

  test('POST /live/session/:id/input — processes real-time text input', async () => {
    const create = await request(app)
      .post('/live/session')
      .send({ projectId: 'proj-1', avatarId: 'avatar-1', mode: 'interactive' });

    await request(app).put(`/live/session/${create.body.id}/start`);

    const res = await request(app)
      .post(`/live/session/${create.body.id}/input`)
      .send({ type: 'text', data: 'Hello avatar!' });

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('dialogue');
    expect(res.body.processed).toBe(true);
    expect(res.body.result.dialogue_generated).toBe(true);
  });

  test('GET /live/sessions — lists active sessions', async () => {
    const create = await request(app)
      .post('/live/session')
      .send({ projectId: 'proj-1', avatarId: 'avatar-1', mode: 'broadcast' });

    await request(app).put(`/live/session/${create.body.id}/start`);

    const res = await request(app).get('/live/sessions');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.sessions[0].id).toBe(create.body.id);
  });
});
