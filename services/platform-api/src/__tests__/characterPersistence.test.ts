/**
 * Round-trip tests for character persistence.
 *
 * The Hair and Wardrobe tabs used to drop every edit on the floor — both
 * carried a `// TODO: persist state (API call)` where the save belonged.
 * These tests assert the property that was missing: an edit that is written
 * comes back on a subsequent read, unchanged and without disturbing the rest
 * of the record.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import charactersRouter from '../routes/characters.js';
import { clearCharacters } from '../services/characterService.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/v1', charactersRouter);
app.use(errorHandler);

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const MISSING_ID = '00000000-0000-0000-0000-0000000000ff';

const baseCharacter = {
  name: 'Kai Tanaka',
  projectId: PROJECT_ID,
  styleMode: 'anime',
  isDigitalTwin: false,
};

/** The full state the Hair tab submits. */
const hairState = {
  style: 'Box Braids',
  color: '#8B4513',
  customHex: '#FF5500',
  highlightsEnabled: true,
  highlightColor: '#DAA520',
  texture: 'Coiled',
  length: 65,
  volume: 80,
  shine: 35,
  facialHairStyle: 'Goatee',
  accessory: 'Headband',
};

/** The full state the Wardrobe tab submits. */
const wardrobeState = {
  selections: {
    Tops: {
      item: 'Hoodie',
      detail: { fabric: 'Knit', color: '#22C55E', pattern: 'Solid', fit: 'Loose' },
    },
    Footwear: {
      item: 'Boots',
      detail: { fabric: 'Leather', color: '#3b2314', pattern: 'Solid', fit: 'Regular' },
    },
  },
  presets: [
    {
      id: 'preset-1',
      name: 'Street',
      selections: {
        Tops: { item: 'Hoodie', detail: { fabric: 'Knit', color: '#000000' } },
      },
    },
  ],
};

async function createCharacter(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/characters')
    .send({ ...baseCharacter, ...overrides });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function readCharacter(id: string) {
  const res = await request(app).get(`/api/v1/characters/${id}`);
  expect(res.status).toBe(200);
  return res.body.data;
}

beforeEach(() => {
  clearCharacters();
});

// ─── HAIR ───────────────────────────────────────────────────────────────────

describe('PUT /api/v1/characters/:id/hair', () => {
  it('round-trips the full hair state through a reload', async () => {
    const id = await createCharacter();

    const saveRes = await request(app).put(`/api/v1/characters/${id}/hair`).send(hairState);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.hairParams).toEqual(hairState);

    const reloaded = await readCharacter(id);
    expect(reloaded.hairParams).toEqual(hairState);
  });

  it('persists a numeric length from the slider', async () => {
    const id = await createCharacter();
    await request(app).put(`/api/v1/characters/${id}/hair`).send(hairState);

    const reloaded = await readCharacter(id);
    expect(reloaded.hairParams.length).toBe(65);
    expect(typeof reloaded.hairParams.length).toBe('number');
  });

  it('still accepts the original descriptive length', async () => {
    const id = await createCharacter();
    const res = await request(app)
      .put(`/api/v1/characters/${id}/hair`)
      .send({ style: 'spiky', color: 'blue', length: 'short' });

    expect(res.status).toBe(200);
    expect((await readCharacter(id)).hairParams.length).toBe('short');
  });

  it('replaces rather than merges, so a removed property stays removed', async () => {
    const id = await createCharacter();
    await request(app).put(`/api/v1/characters/${id}/hair`).send(hairState);

    await request(app)
      .put(`/api/v1/characters/${id}/hair`)
      .send({ style: 'Buzz Cut', color: '#1a1a2e' });

    const reloaded = await readCharacter(id);
    expect(reloaded.hairParams).toEqual({ style: 'Buzz Cut', color: '#1a1a2e' });
    expect(reloaded.hairParams.accessory).toBeUndefined();
  });

  it('leaves the rest of the character untouched', async () => {
    const id = await createCharacter({ voiceId: 'voice-001' });
    await request(app).put(`/api/v1/characters/${id}/hair`).send(hairState);

    const reloaded = await readCharacter(id);
    expect(reloaded.name).toBe('Kai Tanaka');
    expect(reloaded.styleMode).toBe('anime');
    expect(reloaded.voiceId).toBe('voice-001');
    expect(reloaded.id).toBe(id);
  });

  it('survives repeated autosaves', async () => {
    const id = await createCharacter();

    for (const length of [10, 40, 90]) {
      const res = await request(app)
        .put(`/api/v1/characters/${id}/hair`)
        .send({ ...hairState, length });
      expect(res.status).toBe(200);
    }

    expect((await readCharacter(id)).hairParams.length).toBe(90);
  });

  it('returns 404 for a character that does not exist', async () => {
    const res = await request(app).put(`/api/v1/characters/${MISSING_ID}/hair`).send(hairState);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects a malformed payload', async () => {
    const id = await createCharacter();
    const res = await request(app).put(`/api/v1/characters/${id}/hair`).send({ volume: 500 });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─── WARDROBE ───────────────────────────────────────────────────────────────

describe('PUT /api/v1/characters/:id/wardrobe', () => {
  it('round-trips selections and presets through a reload', async () => {
    const id = await createCharacter();

    const saveRes = await request(app).put(`/api/v1/characters/${id}/wardrobe`).send(wardrobeState);
    expect(saveRes.status).toBe(200);

    const reloaded = await readCharacter(id);
    expect(reloaded.wardrobe).toEqual(wardrobeState);
  });

  it('preserves per-item fabric, colour, pattern and fit', async () => {
    const id = await createCharacter();
    await request(app).put(`/api/v1/characters/${id}/wardrobe`).send(wardrobeState);

    const { wardrobe } = await readCharacter(id);
    expect(wardrobe.selections.Tops.detail).toEqual({
      fabric: 'Knit',
      color: '#22C55E',
      pattern: 'Solid',
      fit: 'Loose',
    });
  });

  it('persists an emptied wardrobe', async () => {
    const id = await createCharacter();
    await request(app).put(`/api/v1/characters/${id}/wardrobe`).send(wardrobeState);

    await request(app)
      .put(`/api/v1/characters/${id}/wardrobe`)
      .send({ selections: {}, presets: [] });

    const { wardrobe } = await readCharacter(id);
    expect(wardrobe.selections).toEqual({});
    expect(wardrobe.presets).toEqual([]);
  });

  it('still accepts the original string array form', async () => {
    const id = await createCharacter();
    const res = await request(app).put(`/api/v1/characters/${id}/wardrobe`).send(['armor', 'cape']);

    expect(res.status).toBe(200);
    expect((await readCharacter(id)).wardrobe).toEqual(['armor', 'cape']);
  });

  it('does not disturb hair state', async () => {
    const id = await createCharacter();
    await request(app).put(`/api/v1/characters/${id}/hair`).send(hairState);
    await request(app).put(`/api/v1/characters/${id}/wardrobe`).send(wardrobeState);

    const reloaded = await readCharacter(id);
    expect(reloaded.hairParams).toEqual(hairState);
    expect(reloaded.wardrobe).toEqual(wardrobeState);
  });

  it('returns 404 for a character that does not exist', async () => {
    const res = await request(app)
      .put(`/api/v1/characters/${MISSING_ID}/wardrobe`)
      .send(wardrobeState);

    expect(res.status).toBe(404);
  });

  it('rejects a malformed selection', async () => {
    const id = await createCharacter();
    const res = await request(app)
      .put(`/api/v1/characters/${id}/wardrobe`)
      .send({ selections: { Tops: { detail: {} } } });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─── X5 AVATAR ARTIFACTS ────────────────────────────────────────────────────

describe('PUT /api/v1/characters/:id/avatar', () => {
  const artifacts = {
    gltfUrl: 'https://assets.example.test/char/job/avatar.glb',
    facsRigUrl: 'https://assets.example.test/char/job/facs_rig.json',
    isDigitalTwin: true,
    styleMode: 'realistic',
    bodyParams: {
      estimatedStatureM: 1.72,
      shoulderWidthM: 0.445,
      inseamM: 0.808,
    },
  };

  it('stores the X5 outputs on the character', async () => {
    const id = await createCharacter();

    const res = await request(app).put(`/api/v1/characters/${id}/avatar`).send(artifacts);
    expect(res.status).toBe(200);

    const reloaded = await readCharacter(id);
    expect(reloaded.gltfUrl).toBe(artifacts.gltfUrl);
    expect(reloaded.facsRigUrl).toBe(artifacts.facsRigUrl);
    expect(reloaded.isDigitalTwin).toBe(true);
    expect(reloaded.styleMode).toBe('realistic');
    expect(reloaded.bodyParams.estimatedStatureM).toBeCloseTo(1.72);
  });

  it('a partial result does not blank previously stored URLs', async () => {
    const id = await createCharacter();
    await request(app).put(`/api/v1/characters/${id}/avatar`).send(artifacts);

    await request(app)
      .put(`/api/v1/characters/${id}/avatar`)
      .send({ facsRigUrl: 'https://assets.example.test/char/job2/facs.json' });

    const reloaded = await readCharacter(id);
    expect(reloaded.gltfUrl).toBe(artifacts.gltfUrl);
    expect(reloaded.facsRigUrl).toBe('https://assets.example.test/char/job2/facs.json');
  });

  it('rejects a non-URL artifact location', async () => {
    const id = await createCharacter();
    const res = await request(app)
      .put(`/api/v1/characters/${id}/avatar`)
      .send({ gltfUrl: 'not-a-url' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 404 for a character that does not exist', async () => {
    const res = await request(app).put(`/api/v1/characters/${MISSING_ID}/avatar`).send(artifacts);

    expect(res.status).toBe(404);
  });
});

// ─── REGRESSION ─────────────────────────────────────────────────────────────

describe('character responses are resolved, not pending promises', () => {
  it('GET returns the record rather than a serialised promise', async () => {
    const id = await createCharacter();
    const body = await readCharacter(id);

    expect(body.id).toBe(id);
    expect(Object.keys(body).length).toBeGreaterThan(1);
  });

  it('GET on a missing character is a 404, not an empty 200', async () => {
    const res = await request(app).get(`/api/v1/characters/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  it('DELETE on a missing character is a 404, not a 204', async () => {
    const res = await request(app).delete(`/api/v1/characters/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });
});
