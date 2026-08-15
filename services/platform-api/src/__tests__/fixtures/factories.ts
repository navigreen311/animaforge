/**
 * Test fixtures that seed a coherent object graph.
 *
 * Closes #73. The suites used to seed by inventing an id — `const PROJECT_ID =
 * '0000...0001'` — and then creating a scene against it. In the in-memory store
 * nothing checks the reference, so it passed; against Postgres the insert
 * violates `scenes_project_id_fkey` and the whole file fails. A fixture that
 * only works when nothing validates it is not a fixture.
 *
 * Every factory here creates its own parents first, so a shot always has a
 * scene, a scene always has a project, and a project always has an owner. The
 * same code runs in both modes: the services already branch on
 * `isDatabaseReachable()`, so going through them keeps the graph correct in
 * memory and in Postgres without the tests knowing which they are in.
 */

import { randomUUID } from 'node:crypto';
import { isDatabaseReachable, requirePrisma } from '../../db.js';
import { projectService } from '../../services/projectService.js';
import { sceneService } from '../../services/sceneService.js';
import { shotService } from '../../services/shotService.js';
import type { Project } from '../../models/projectSchemas.js';
import type { Scene } from '../../models/sceneSchemas.js';
import type { Shot } from '../../models/shotSchemas.js';

/** A scene graph that satisfies `SceneGraphSchema`. */
export const VALID_SCENE_GRAPH = {
  subject: 'A fixture subject',
  camera: { angle: 'wide', movement: 'static', focal_length: '35mm' },
  action: 'stands still',
  emotion: 'neutral',
  timing: { duration_ms: 3000, pacing: 'even' },
};

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ensure a User row exists and return its id.
 *
 * `Project.ownerId` is a non-null FK to `users`, so in Postgres mode a project
 * cannot be created until its owner exists. In memory mode there is no user
 * table to seed, so the id is simply handed back.
 */
export async function seedUser(
  overrides: { id?: string; email?: string; role?: string } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID();
  const email = overrides.email ?? `fixture-${id}@animaforge.test`;

  if (await isDatabaseReachable()) {
    await requirePrisma().user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email,
        displayName: 'Fixture User',
        role: overrides.role ?? 'editor',
      },
    });
  }

  return id;
}

/** The user the auth-token helper in each suite claims to be. */
export const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';

/**
 * The hardcoded owner that assetController and characterController attribute
 * every write to. Until a real auth subject replaces it, any suite that creates
 * a character or an asset needs this row to exist or the insert violates
 * `characters_owner_id_fkey`.
 */
export const STUB_OWNER_ID = '00000000-0000-0000-0000-000000000001';

/** Seed the caller identity the suites' bearer tokens assert. */
export function seedTestUser(): Promise<string> {
  return seedUser({ id: TEST_USER_ID, email: 'test@animaforge.io', role: 'editor' });
}

/** Seed the controllers' stub owner. */
export function seedStubOwner(): Promise<string> {
  return seedUser({ id: STUB_OWNER_ID, email: 'stub-owner@animaforge.test', role: 'editor' });
}

/* ------------------------------------------------------------------ */
/*  Projects → scenes → shots                                          */
/* ------------------------------------------------------------------ */

export interface SeededProject {
  project: Project;
  ownerId: string;
}

/** Create a project, seeding its owner first. */
export async function seedProject(
  overrides: { title?: string; description?: string; ownerId?: string } = {},
): Promise<SeededProject> {
  const ownerId = overrides.ownerId ?? (await seedTestUser());
  const project = await projectService.create(
    {
      title: overrides.title ?? 'Fixture Project',
      description: overrides.description ?? '',
    },
    ownerId,
  );
  return { project, ownerId };
}

export interface SeededScene extends SeededProject {
  scene: Scene;
}

/** Create a scene, seeding its project (and that project's owner) first. */
export async function seedScene(
  overrides: { title?: string; order?: number; projectId?: string; ownerId?: string } = {},
): Promise<SeededScene> {
  const parent = overrides.projectId
    ? { project: { id: overrides.projectId } as Project, ownerId: overrides.ownerId ?? '' }
    : await seedProject({ ownerId: overrides.ownerId });

  const scene = await sceneService.create(parent.project.id, {
    title: overrides.title ?? 'Fixture Scene',
    order: overrides.order ?? 1,
  });

  return { ...parent, scene };
}

export interface SeededShot extends SeededScene {
  shot: Shot;
}

/** Create a shot, seeding its scene and project first. */
export async function seedShot(
  overrides: {
    sceneId?: string;
    projectId?: string;
    prompt?: string;
  } = {},
): Promise<SeededShot> {
  const parent =
    overrides.sceneId && overrides.projectId
      ? {
          scene: { id: overrides.sceneId } as Scene,
          project: { id: overrides.projectId } as Project,
          ownerId: '',
        }
      : await seedScene();

  const shot = await shotService.create(parent.scene.id, parent.project.id, {
    sceneGraph: VALID_SCENE_GRAPH,
    prompt: overrides.prompt ?? 'A fixture shot',
    characterRefs: [],
    durationMs: 3000,
    aspectRatio: '16:9',
  });

  return { ...parent, shot };
}

/* ------------------------------------------------------------------ */
/*  Reset                                                              */
/* ------------------------------------------------------------------ */

/**
 * Clear state between tests.
 *
 * The per-service `_clear()` helpers only empty the in-memory maps. Once
 * DATABASE_URL is set the services write to Postgres instead, so those helpers
 * clear a store nothing is reading and rows accumulate across tests — which is
 * why "expected 2, got 20" appeared only in the Postgres run. This clears both.
 *
 * Deletion is ordered child-first so foreign keys stay satisfied: users are
 * last because characters, assets and projects all reference them.
 */
export async function resetFixtures(): Promise<void> {
  projectService.resetStore();
  sceneService._clear();
  shotService._clear();

  if (!(await isDatabaseReachable())) return;

  const prisma = requirePrisma();

  // Order matters, and this is the single ordered list: users are referenced by
  // a dozen tables, so every one of them has to be cleared first or
  // `user.deleteMany` fails on a foreign key. Adding a user-owned table? Add it
  // here, not to a second cleanup in your own suite.
  await prisma.shotTake.deleteMany({});
  await prisma.shot.deleteMany({});
  await prisma.scene.deleteMany({});
  await prisma.generationJob.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.receipt.deleteMany({});
  // Console resources (#58).
  await prisma.avatar.deleteMany({});
  await prisma.voice.deleteMany({});
  await prisma.brandKit.deleteMany({});
  await prisma.script.deleteMany({});
  await prisma.marker.deleteMany({});
  await prisma.customDomain.deleteMany({});
  await prisma.assetFolder.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.webhookEndpoint.deleteMany({});
  await prisma.notification.deleteMany({});

  await prisma.user.deleteMany({
    where: {
      OR: [{ email: { contains: '@animaforge.test' } }, { email: { in: ['test@animaforge.io'] } }],
    },
  });
}
