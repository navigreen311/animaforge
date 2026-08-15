/**
 * Tests for character tab persistence.
 *
 * The round trip these cover is the one that was missing entirely: tab state
 * -> wire payload -> stored record -> tab state. A mapping bug here loses a
 * user's saved hair or wardrobe silently, which is exactly how the original
 * `// TODO: persist state (API call)` behaved.
 */
import { describe, it, expect, vi } from 'vitest';

import {
  CharacterApiError,
  DEFAULT_HAIR_STATE,
  DEFAULT_WARDROBE_STATE,
  hairParamsToState,
  hairStateToParams,
  loadCharacter,
  resolveBaseUrl,
  saveHairParams,
  saveWardrobe,
  wardrobePayloadToState,
  wardrobeStateToPayload,
  type HairState,
  type WardrobeState,
} from './characterApi';

const hairState: HairState = {
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

const wardrobeState: WardrobeState = {
  selections: {
    Tops: {
      item: 'Hoodie',
      detail: { fabric: 'Knit', color: '#22C55E', pattern: 'Solid', fit: 'Loose' },
    },
    Footwear: { item: 'Boots', detail: { fabric: 'Leather', color: '#3b2314' } },
  },
  presets: [
    { id: 'preset-1', name: 'Street', selections: { Tops: { item: 'Hoodie' } } },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/* ── Hair mapping ────────────────────────────────────────────────────────── */

describe('hair mapping', () => {
  it('round-trips the full state', () => {
    expect(hairParamsToState(hairStateToParams(hairState))).toEqual(hairState);
  });

  it('falls back to defaults when nothing is stored', () => {
    expect(hairParamsToState(undefined)).toEqual(DEFAULT_HAIR_STATE);
    expect(hairParamsToState(null)).toEqual(DEFAULT_HAIR_STATE);
  });

  it('merges a partial record over the defaults', () => {
    const state = hairParamsToState({ style: 'Afro', color: '#000000' });
    expect(state.style).toBe('Afro');
    expect(state.color).toBe('#000000');
    expect(state.texture).toBe(DEFAULT_HAIR_STATE.texture);
    expect(state.length).toBe(DEFAULT_HAIR_STATE.length);
  });

  it('coerces a numeric string length', () => {
    expect(hairParamsToState({ length: '70' }).length).toBe(70);
  });

  it('falls back when a legacy descriptive length is stored', () => {
    // The original API stored "short"/"long"; the slider needs a number.
    expect(hairParamsToState({ length: 'short' }).length).toBe(
      DEFAULT_HAIR_STATE.length,
    );
  });

  it('clamps out-of-range values instead of rendering them', () => {
    expect(hairParamsToState({ volume: 500 }).volume).toBe(100);
    expect(hairParamsToState({ shine: -20 }).shine).toBe(0);
  });

  it('ignores explicit undefined rather than blanking a field', () => {
    const state = hairParamsToState({ style: undefined, color: '#fff' });
    expect(state.style).toBe(DEFAULT_HAIR_STATE.style);
    expect(state.color).toBe('#fff');
  });

  it('preserves false and empty string', () => {
    const state = hairParamsToState({ highlightsEnabled: false, customHex: '' });
    expect(state.highlightsEnabled).toBe(false);
    expect(state.customHex).toBe('');
  });
});

/* ── Wardrobe mapping ────────────────────────────────────────────────────── */

describe('wardrobe mapping', () => {
  it('round-trips selections and presets', () => {
    expect(wardrobePayloadToState(wardrobeStateToPayload(wardrobeState))).toEqual(
      wardrobeState,
    );
  });

  it('preserves per-item detail', () => {
    const restored = wardrobePayloadToState(wardrobeStateToPayload(wardrobeState));
    expect(restored.selections.Tops.detail).toEqual({
      fabric: 'Knit',
      color: '#22C55E',
      pattern: 'Solid',
      fit: 'Loose',
    });
  });

  it('falls back to an empty wardrobe', () => {
    expect(wardrobePayloadToState(undefined)).toEqual(DEFAULT_WARDROBE_STATE);
    expect(wardrobePayloadToState(null)).toEqual(DEFAULT_WARDROBE_STATE);
  });

  it('round-trips a deliberately emptied wardrobe', () => {
    const emptied: WardrobeState = { selections: {}, presets: [] };
    expect(wardrobePayloadToState(wardrobeStateToPayload(emptied))).toEqual(emptied);
  });

  it('reads the legacy string array form without losing items', () => {
    const state = wardrobePayloadToState(['armor', 'cape']);
    expect(Object.keys(state.selections)).toHaveLength(2);
    expect(Object.values(state.selections).map((s) => s.item)).toEqual([
      'armor',
      'cape',
    ]);
  });

  it('tolerates a payload missing presets', () => {
    const state = wardrobePayloadToState({ selections: { Tops: { item: 'Tee' } } });
    expect(state.presets).toEqual([]);
    expect(state.selections.Tops.item).toBe('Tee');
  });
});

/* ── Transport ───────────────────────────────────────────────────────────── */

describe('base URL', () => {
  it('prefers an explicit override', () => {
    expect(resolveBaseUrl({ baseUrl: 'https://api.example.test' })).toBe(
      'https://api.example.test',
    );
  });

  it('strips trailing slashes', () => {
    expect(resolveBaseUrl({ baseUrl: 'https://api.example.test/' })).toBe(
      'https://api.example.test',
    );
  });
});

describe('saveHairParams', () => {
  it('PUTs the hair params to the character', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { id: 'c1', hairParams: hairState } }),
    );

    const result = await saveHairParams('c1', hairState, {
      baseUrl: 'https://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/characters/c1/hair');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual(hairState);
    expect(result.hairParams).toEqual(hairState);
  });

  it('unwraps the success envelope', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { id: 'c1' } }));

    const result = await saveHairParams('c1', hairState, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.id).toBe('c1');
  });

  it('sends a bearer token when one is supplied', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));

    await saveHairParams('c1', hairState, {
      token: 'jwt-123',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-123');
  });

  it('omits the header when there is no token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));

    await saveHairParams('c1', hairState, {
      token: null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('escapes the character id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'x' } }));

    await saveHairParams('a/b c', hairState, {
      baseUrl: 'https://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://api.test/api/v1/characters/a%2Fb%20c/hair',
    );
  });

  it('raises the server error message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: { message: 'Character not found' } }, 404),
    );

    await expect(
      saveHairParams('missing', hairState, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow('Character not found');
  });

  it('reports the status when the body is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    await expect(
      saveHairParams('c1', hairState, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(CharacterApiError);
  });
});

describe('saveWardrobe', () => {
  it('PUTs selections and presets', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));

    await saveWardrobe('c1', wardrobeState, {
      baseUrl: 'https://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/characters/c1/wardrobe');
    expect(JSON.parse(init.body)).toEqual({
      selections: wardrobeState.selections,
      presets: wardrobeState.presets,
    });
  });
});

describe('loadCharacter', () => {
  it('GETs the character without a body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { id: 'c1', hairParams: hairState } }));

    const character = await loadCharacter('c1', {
      baseUrl: 'https://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/characters/c1');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(character.hairParams).toEqual(hairState);
  });
});

/* ── End-to-end shape ────────────────────────────────────────────────────── */

describe('save then reload', () => {
  it('returns the same hair state the tab submitted', async () => {
    let stored: unknown;
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      if (init.method === 'PUT') {
        stored = JSON.parse(init.body as string);
        return Promise.resolve(jsonResponse({ data: { id: 'c1' } }));
      }
      return Promise.resolve(jsonResponse({ data: { id: 'c1', hairParams: stored } }));
    });

    const context = { fetchImpl: fetchImpl as unknown as typeof fetch };
    await saveHairParams('c1', hairState, context);
    const reloaded = await loadCharacter('c1', context);

    expect(hairParamsToState(reloaded.hairParams)).toEqual(hairState);
  });

  it('returns the same wardrobe state the tab submitted', async () => {
    let stored: unknown;
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      if (init.method === 'PUT') {
        stored = JSON.parse(init.body as string);
        return Promise.resolve(jsonResponse({ data: { id: 'c1' } }));
      }
      return Promise.resolve(jsonResponse({ data: { id: 'c1', wardrobe: stored } }));
    });

    const context = { fetchImpl: fetchImpl as unknown as typeof fetch };
    await saveWardrobe('c1', wardrobeState, context);
    const reloaded = await loadCharacter('c1', context);

    expect(wardrobePayloadToState(reloaded.wardrobe)).toEqual(wardrobeState);
  });
});
