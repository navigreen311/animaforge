import request from 'supertest';
import { app } from '../index';
import { clearStore } from '../services/piracyService';

afterEach(() => {
  clearStore();
});

describe('Piracy Monitoring Service', () => {
  test('POST /piracy/register — registers content for monitoring', async () => {
    const res = await request(app)
      .post('/piracy/register')
      .send({ outputId: 'out-1', watermarkId: 'wm-1', metadata: { title: 'Test Animation' } });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.outputId).toBe('out-1');
    expect(res.body.watermarkId).toBe('wm-1');
    expect(res.body.metadata.title).toBe('Test Animation');
  });

  test('POST /piracy/scan — scans platforms for unauthorized content', async () => {
    const res = await request(app)
      .post('/piracy/scan')
      .send({ query: 'test animation', platforms: ['youtube', 'tiktok'] });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe('test animation');
    expect(res.body.platforms).toEqual(['youtube', 'tiktok']);
    expect(res.body).toHaveProperty('total_matches');
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  test('GET /piracy/alerts — lists piracy alerts', async () => {
    // Trigger a scan to potentially generate alerts
    await request(app)
      .post('/piracy/scan')
      .send({ query: 'test', platforms: ['youtube'] });

    const res = await request(app).get('/piracy/alerts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('alerts');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });

  test('POST /piracy/scan — rejects invalid request', async () => {
    const res = await request(app)
      .post('/piracy/scan')
      .send({ query: 'test' }); // missing platforms

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('platforms');
  });

  test('GET /piracy/dashboard — returns monitoring stats', async () => {
    // Register content and run a scan
    await request(app)
      .post('/piracy/register')
      .send({ outputId: 'out-1', watermarkId: 'wm-1' });

    await request(app)
      .post('/piracy/scan')
      .send({ query: 'test', platforms: ['youtube'] });

    const res = await request(app).get('/piracy/dashboard');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_registered', 1);
    expect(res.body).toHaveProperty('total_scans', 1);
    expect(res.body).toHaveProperty('matches_found');
    expect(res.body).toHaveProperty('dmca_sent');
    expect(res.body).toHaveProperty('takedown_rate');
  });

  test('PUT /piracy/alerts/:id/action — rejects invalid action', async () => {
    const res = await request(app)
      .put('/piracy/alerts/fake-id/action')
      .send({ action: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('action must be');
  });
});
