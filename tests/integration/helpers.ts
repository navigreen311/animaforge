/**
 * Test helpers — factory functions and request utilities for integration tests.
 */
import { prisma } from './setup';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';

// Re-export prisma for convenience
export { prisma };

const JWT_SECRET = process.env.JWT_SECRET || 'animaforge-dev-secret';
const SALT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Platform API app (for supertest)
// ---------------------------------------------------------------------------

let _platformApp: any;
let _authApp: any;
let _billingApp: any;
let _moderationApp: any;

export async function getPlatformApp() {
  if (!_platformApp) {
    const mod = await import('../../services/platform-api/src/index.js');
    _platformApp = mod.default;
  }
  return _platformApp;
}

export async function getAuthApp() {
  if (!_authApp) {
    const mod = await import('../../services/auth/src/index');
    _authApp = mod.default;
  }
  return _authApp;
}

export async function getBillingApp() {
  if (!_billingApp) {
    const mod = await import('../../services/billing/src/index');
    _billingApp = (mod as any).app ?? mod.default;
  }
  return _billingApp;
}

export async function getModerationApp() {
  if (!_moderationApp) {
    const mod = await import(
      '../../services/governance/moderation/src/index'
    );
    _moderationApp = (mod as any).app ?? mod.default;
  }
  return _moderationApp;
}

// ---------------------------------------------------------------------------
// Factory: User
// ---------------------------------------------------------------------------

export interface TestUserOverrides {
  email?: string;
  displayName?: string;
  role?: string;
  tier?: string;
  password?: string;
}

export async function createTestUser(overrides: TestUserOverrides = {}) {
  const password = overrides.password ?? 'Test1234!';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `testuser-${uuidv4()}@test.com`,
      displayName: overrides.displayName ?? 'Test User',
      role: overrides.role ?? 'creator',
      tier: overrides.tier ?? 'free',
      genMemory: { passwordHash },
    },
  });

  return { ...user, password, passwordHash };
}

// ---------------------------------------------------------------------------
// Factory: Project
// ---------------------------------------------------------------------------

export interface TestProjectOverrides {
  title?: string;
  description?: string;
  status?: string;
  worldBible?: Record<string, unknown>;
}

export async function createTestProject(
  userId: string,
  overrides: TestProjectOverrides = {},
) {
  return prisma.project.create({
    data: {
      ownerId: userId,
      title: overrides.title ?? `Test Project ${uuidv4().slice(0, 8)}`,
      description: overrides.description ?? 'A test project',
      status: overrides.status ?? 'active',
      worldBible: overrides.worldBible ?? {},
    },
  });
}

// ---------------------------------------------------------------------------
// Factory: Scene
// ---------------------------------------------------------------------------

export interface TestSceneOverrides {
  title?: string;
  order?: number;
}

export async function createTestScene(
  projectId: string,
  overrides: TestSceneOverrides = {},
) {
  return prisma.scene.create({
    data: {
      projectId,
      title: overrides.title ?? `Scene ${uuidv4().slice(0, 8)}`,
      order: overrides.order ?? 1,
    },
  });
}

// ---------------------------------------------------------------------------
// Factory: Shot
// ---------------------------------------------------------------------------

export interface TestShotOverrides {
  shotNumber?: number;
  sceneGraph?: Record<string, unknown>;
  prompt?: string;
  characterRefs?: string[];
  durationMs?: number;
  aspectRatio?: string;
  status?: string;
}

export async function createTestShot(
  sceneId: string,
  projectId: string,
  overrides: TestShotOverrides = {},
) {
  const defaultSceneGraph = {
    subject: 'hero character',
    camera: { angle: 'medium', movement: 'pan', focal_length: '50mm' },
    action: 'walking forward',
    emotion: 'determined',
    timing: { duration_ms: 5000, pacing: 'normal' },
  };

  return prisma.shot.create({
    data: {
      sceneId,
      projectId,
      shotNumber: overrides.shotNumber ?? 1,
      sceneGraph: overrides.sceneGraph ?? defaultSceneGraph,
      prompt: overrides.prompt ?? 'A hero walking through the forest',
      characterRefs: overrides.characterRefs ?? [],
      durationMs: overrides.durationMs ?? 5000,
      aspectRatio: overrides.aspectRatio ?? '16:9',
      status: overrides.status ?? 'draft',
    },
  });
}

// ---------------------------------------------------------------------------
// Factory: Character
// ---------------------------------------------------------------------------

export interface TestCharacterOverrides {
  name?: string;
  styleMode?: string;
  projectId?: string;
}

export async function createTestCharacter(
  userId: string,
  overrides: TestCharacterOverrides = {},
) {
  return prisma.character.create({
    data: {
      ownerId: userId,
      name: overrides.name ?? `Character ${uuidv4().slice(0, 8)}`,
      styleMode: overrides.styleMode ?? 'realistic',
      projectId: overrides.projectId,
    },
  });
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Generate a valid JWT for a test user.
 * Uses the same secret and payload shape as the auth service.
 */
export function getAuthToken(
  userId: string,
  extra: { email?: string; role?: string; tier?: string } = {},
): string {
  const payload = {
    userId,
    email: extra.email ?? 'test@test.com',
    role: extra.role ?? 'creator',
    tier: extra.tier ?? 'free',
    jti: uuidv4(),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Generate an expired JWT for testing expiration handling.
 */
export function getExpiredToken(userId: string): string {
  const payload = {
    userId,
    email: 'test@test.com',
    role: 'creator',
    tier: 'free',
    jti: uuidv4(),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '0s' });
}

/**
 * Build a bearer token that the platform-api auth middleware can decode.
 * The platform-api middleware reads `sub`, `email`, `role` from the JWT payload.
 */
export function getPlatformToken(
  userId: string,
  extra: { email?: string; role?: string } = {},
): string {
  const payload = {
    sub: userId,
    email: extra.email ?? 'test@test.com',
    role: extra.role ?? 'creator',
  };
  // Build a 3-part dot-separated token where part[1] is base64url JSON
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = Buffer.from('test-signature').toString('base64url');
  return `${header}.${body}.${sig}`;
}

// ---------------------------------------------------------------------------
// Supertest helper
// ---------------------------------------------------------------------------

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Send a request to the platform API via supertest.
 */
export async function apiRequest(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
) {
  const app = await getPlatformApp();
  let req = request(app)[method](path);

  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }

  if (body && (method === 'post' || method === 'put' || method === 'patch')) {
    req = req.send(body);
  }

  return req;
}

/**
 * Send a request to the auth API via supertest.
 */
export async function authRequest(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
) {
  const app = await getAuthApp();
  let req = request(app)[method](path);

  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }

  if (body && (method === 'post' || method === 'put' || method === 'patch')) {
    req = req.send(body);
  }

  return req;
}

/**
 * Send a request to the billing API via supertest.
 */
export async function billingRequest(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
) {
  const app = await getBillingApp();
  let req = request(app)[method](path);

  if (body && (method === 'post' || method === 'put' || method === 'patch')) {
    req = req.send(body);
  }

  return req;
}

/**
 * Send a request to the moderation API via supertest.
 */
export async function moderationRequest(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
) {
  const app = await getModerationApp();
  let req = request(app)[method](path);

  if (body && (method === 'post' || method === 'put' || method === 'patch')) {
    req = req.send(body);
  }

  return req;
}
