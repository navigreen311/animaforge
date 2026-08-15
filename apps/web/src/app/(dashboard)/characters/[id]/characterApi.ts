/**
 * Persistence for the character detail tabs.
 *
 * The Hair and Wardrobe tabs previously held their state in React only, with
 * a `// TODO: persist state (API call)` where the save belonged, so every
 * edit was lost on navigation. This module is the save/load path they use.
 *
 * It deliberately imports nothing: no store, no `@/` alias, no framework.
 * That keeps the mapping logic — the part that can silently corrupt a user's
 * saved wardrobe — unit-testable on its own, and lets the caller decide how a
 * request is authenticated.
 */

/* ── Wire types (mirror services/platform-api characterSchemas) ─────────── */

export interface HairParams {
  style?: string;
  color?: string;
  customHex?: string;
  highlightsEnabled?: boolean;
  highlightColor?: string;
  texture?: string;
  length?: number | string;
  volume?: number;
  shine?: number;
  facialHairStyle?: string;
  accessory?: string;
}

export interface WardrobeItemDetail {
  fabric?: string;
  color?: string;
  pattern?: string;
  fit?: string;
}

export interface WardrobeSelection {
  item: string;
  detail?: WardrobeItemDetail;
}

export interface WardrobePreset {
  id: string;
  name: string;
  selections: Record<string, WardrobeSelection>;
}

export interface WardrobePayload {
  selections?: Record<string, WardrobeSelection>;
  presets?: WardrobePreset[];
}

/** The server also accepts the original flat form, and older rows still use it. */
export type StoredWardrobe = WardrobePayload | string[];

export interface CharacterRecord {
  id: string;
  name?: string;
  styleMode?: string;
  isDigitalTwin?: boolean;
  hairParams?: HairParams;
  wardrobe?: StoredWardrobe;
  gltfUrl?: string;
  facsRigUrl?: string;
  bodyParams?: Record<string, unknown>;
}

/* ── Client state shapes ────────────────────────────────────────────────── */

export interface HairState {
  style: string;
  color: string;
  customHex: string;
  highlightsEnabled: boolean;
  highlightColor: string;
  texture: string;
  length: number;
  volume: number;
  shine: number;
  facialHairStyle: string;
  accessory: string;
}

export const DEFAULT_HAIR_STATE: HairState = {
  style: 'Short Crop',
  color: '#1a1a2e',
  customHex: '',
  highlightsEnabled: false,
  highlightColor: '#DAA520',
  texture: 'Straight',
  length: 40,
  volume: 50,
  shine: 50,
  facialHairStyle: 'None',
  accessory: 'None',
};

export interface WardrobeState {
  selections: Record<string, WardrobeSelection>;
  presets: WardrobePreset[];
}

export const DEFAULT_WARDROBE_STATE: WardrobeState = {
  selections: {},
  presets: [],
};

/* ── Mapping ────────────────────────────────────────────────────────────── */

export function hairStateToParams(state: HairState): HairParams {
  return { ...state };
}

/**
 * Merge stored hair params over the defaults.
 *
 * `length` is widened on the wire because the original API took descriptive
 * values ("short"); the slider needs a number, so a non-numeric value falls
 * back to the default rather than rendering `NaN`.
 */
export function hairParamsToState(params: HairParams | undefined | null): HairState {
  if (!params) return { ...DEFAULT_HAIR_STATE };

  return {
    ...DEFAULT_HAIR_STATE,
    ...stripUndefined(params),
    length: toPercent(params.length, DEFAULT_HAIR_STATE.length),
    volume: toPercent(params.volume, DEFAULT_HAIR_STATE.volume),
    shine: toPercent(params.shine, DEFAULT_HAIR_STATE.shine),
  } as HairState;
}

export function wardrobeStateToPayload(state: WardrobeState): WardrobePayload {
  return { selections: state.selections, presets: state.presets };
}

/**
 * Read stored wardrobe into tab state.
 *
 * Accepts the legacy `string[]` form, mapping each entry to an "Other"
 * selection so an old record still shows its items rather than appearing
 * empty — which would look like data loss to the user.
 */
export function wardrobePayloadToState(stored: StoredWardrobe | undefined | null): WardrobeState {
  if (!stored) return { selections: {}, presets: [] };

  if (Array.isArray(stored)) {
    const selections: Record<string, WardrobeSelection> = {};
    stored.forEach((item, index) => {
      selections[`Item ${index + 1}`] = { item };
    });
    return { selections, presets: [] };
  }

  return {
    selections: stored.selections ?? {},
    presets: stored.presets ?? [],
  };
}

/* ── Transport ──────────────────────────────────────────────────────────── */

export interface RequestContext {
  /** Defaults to `NEXT_PUBLIC_API_URL`, then `http://localhost:4000`. */
  baseUrl?: string;
  /** Bearer token; omitted when null so cookie auth still works. */
  token?: string | null;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export class CharacterApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CharacterApiError';
  }
}

export function resolveBaseUrl(context: RequestContext = {}): string {
  const configured =
    context.baseUrl ??
    (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined);
  return (configured || 'http://localhost:4000').replace(/\/+$/, '');
}

async function send<T>(
  method: string,
  path: string,
  body: unknown,
  context: RequestContext,
): Promise<T> {
  const doFetch = context.fetchImpl ?? fetch;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (context.token) headers.Authorization = `Bearer ${context.token}`;

  const response = await doFetch(`${resolveBaseUrl(context)}${path}`, {
    method,
    headers,
    credentials: 'include',
    signal: context.signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const detail = await readErrorMessage(response);
    throw new CharacterApiError(response.status, detail);
  }

  const payload = (await response.json()) as { data?: T } | T;
  return (payload as { data?: T }).data ?? (payload as T);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message ?? body?.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function loadCharacter(
  characterId: string,
  context: RequestContext = {},
): Promise<CharacterRecord> {
  return send<CharacterRecord>(
    'GET',
    `/api/v1/characters/${encodeURIComponent(characterId)}`,
    undefined,
    context,
  );
}

export function saveHairParams(
  characterId: string,
  state: HairState,
  context: RequestContext = {},
): Promise<CharacterRecord> {
  return send<CharacterRecord>(
    'PUT',
    `/api/v1/characters/${encodeURIComponent(characterId)}/hair`,
    hairStateToParams(state),
    context,
  );
}

export function saveWardrobe(
  characterId: string,
  state: WardrobeState,
  context: RequestContext = {},
): Promise<CharacterRecord> {
  return send<CharacterRecord>(
    'PUT',
    `/api/v1/characters/${encodeURIComponent(characterId)}/wardrobe`,
    wardrobeStateToPayload(state),
    context,
  );
}

/* ── Internals ──────────────────────────────────────────────────────────── */

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function toPercent(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}
