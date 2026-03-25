import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../index';
import {
  assets,
  retentionPolicies,
  userTiers,
  TIER_QUOTAS,
} from '../services/lifecycleService';
import type { StorageAsset } from '../models/storageSchemas';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<StorageAsset> = {}): StorageAsset {
  const id = overrides.id ?? uuidv4();
  const now = new Date().toISOString();
  return {
    id,
    projectId: overrides.projectId ?? uuidv4(),
    userId: overrides.userId ?? uuidv4(),
    filename: overrides.filename ?? 'test-file.png',
    assetType: overrides.assetType ?? 'image',
    sizeBytes: overrides.sizeBytes ?? 1024 * 1024,
    storageClass: overrides.storageClass ?? 'hot',
    status: overrides.status ?? 'active',
    linkedEntityId: 'linkedEntityId' in overrides ? overrides.linkedEntityId! : uuidv4(),
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    expiresAt: overrides.expiresAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    restoreRequestedAt: overrides.restoreRequestedAt ?? null,
  };
}

beforeEach(() => {
  assets.clear();
  retentionPolicies.clear();
  userTiers.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Storage Lifecycle Service', () => {
  test('GET /storage/usage/:projectId returns usage breakdown by type', async () => {
    const projectId = uuidv4();
    const userId = uuidv4();
    assets.set('a1', makeAsset({ id: 'a1', projectId, userId, assetType: 'image', sizeBytes: 5000 }));
    assets.set('a2', makeAsset({ id: 'a2', projectId, userId, assetType: 'video', sizeBytes: 20000 }));
    assets.set('a3', makeAsset({ id: 'a3', projectId, userId, assetType: 'image', sizeBytes: 3000 }));

    const res = await request(app).get(`/storage/usage/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.totalBytes).toBe(28000);
    expect(res.body.byType.image).toBe(8000);
    expect(res.body.byType.video).toBe(20000);
    expect(res.body.assetCount).toBe(3);
  });

  test('GET /storage/usage/user/:userId returns cross-project usage', async () => {
    const userId = uuidv4();
    const p1 = uuidv4();
    const p2 = uuidv4();
    assets.set('a1', makeAsset({ id: 'a1', projectId: p1, userId, sizeBytes: 1000 }));
    assets.set('a2', makeAsset({ id: 'a2', projectId: p2, userId, sizeBytes: 2000 }));

    const res = await request(app).get(`/storage/usage/user/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.totalBytes).toBe(3000);
    expect(res.body.projectBreakdown[p1]).toBe(1000);
    expect(res.body.projectBreakdown[p2]).toBe(2000);
  });

  test('POST /storage/archive/:assetId moves asset to glacier', async () => {
    const asset = makeAsset();
    assets.set(asset.id, asset);

    const res = await request(app).post(`/storage/archive/${asset.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.asset.storageClass).toBe('glacier');
    expect(res.body.asset.status).toBe('archived');
  });

  test('POST /storage/restore/:assetId restores archived asset', async () => {
    const asset = makeAsset({ status: 'archived', storageClass: 'glacier', archivedAt: new Date().toISOString() });
    assets.set(asset.id, asset);

    const res = await request(app).post(`/storage/restore/${asset.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.asset.storageClass).toBe('hot');
    expect(res.body.asset.status).toBe('active');
  });

  test('POST /storage/cleanup removes orphaned and expired assets', async () => {
    const orphan = makeAsset({ linkedEntityId: null, status: 'active' });
    const expired = makeAsset({
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
      linkedEntityId: uuidv4(),
    });
    const healthy = makeAsset({ linkedEntityId: uuidv4() });

    assets.set(orphan.id, orphan);
    assets.set(expired.id, expired);
    assets.set(healthy.id, healthy);

    const res = await request(app).post('/storage/cleanup').send({ dryRun: false });
    expect(res.status).toBe(200);
    expect(res.body.orphaned).toContain(orphan.id);
    expect(res.body.expired).toContain(expired.id);
    expect(assets.get(orphan.id)?.status).toBe('deleted');
    expect(assets.get(expired.id)?.status).toBe('deleted');
    expect(assets.get(healthy.id)?.status).toBe('active');
  });

  test('GET /storage/policies returns default policies with tier quotas', async () => {
    const res = await request(app).get('/storage/policies');
    expect(res.status).toBe(200);
    expect(res.body.retentionDays).toBe(365);
    expect(res.body.autoArchiveDays).toBe(90);
    expect(res.body.tierQuotas).toEqual(TIER_QUOTAS);
  });

  test('PUT /storage/policies/:projectId sets retention policy', async () => {
    const projectId = uuidv4();
    const res = await request(app)
      .put(`/storage/policies/${projectId}`)
      .send({ retentionDays: 180, autoArchiveDays: 30, autoDeleteExpired: true });

    expect(res.status).toBe(200);
    expect(res.body.projectId).toBe(projectId);
    expect(res.body.retentionDays).toBe(180);
    expect(res.body.autoArchiveDays).toBe(30);
    expect(res.body.autoDeleteExpired).toBe(true);
  });

  test('GET /storage/quota/:userId returns quota vs tier limits', async () => {
    const userId = uuidv4();
    userTiers.set(userId, 'pro');
    assets.set('a1', makeAsset({ userId, sizeBytes: 1024 * 1024 * 100 }));

    const res = await request(app).get(`/storage/quota/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.tier).toBe('pro');
    expect(res.body.quotaLabel).toBe('200GB');
    expect(res.body.usedBytes).toBe(1024 * 1024 * 100);
    expect(res.body.isOverQuota).toBe(false);
  });
});
