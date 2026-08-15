import { Router } from 'express';
import { z } from 'zod';
import { crudRouter } from '../../lib/crudRouter.js';

/**
 * The console resources that are plain CRUD over one table.
 *
 * Anything needing more than list/create/read/update/delete lives in its own
 * module and mounts extra routes there; keeping the plain ones declarative
 * means the ownership filter is applied by construction rather than remembered
 * twenty times.
 */

const router = Router();

/* ------------------------------------------------------------------ */
/*  Avatars                                                            */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/avatars',
    model: 'avatar',
    ownerField: 'userId',
    searchFields: ['name'],
    include: { voice: true },
    createSchema: z.object({
      name: z.string().min(1).max(120),
      sourceType: z.enum(['upload', 'photo', 'generated']).default('upload'),
      previewUrl: z.string().url().optional(),
      modelUrl: z.string().url().optional(),
      voiceId: z.string().optional(),
      metadata: z.record(z.unknown()).default({}),
    }),
    updateSchema: z.object({
      name: z.string().min(1).max(120).optional(),
      status: z.enum(['draft', 'processing', 'ready', 'failed']).optional(),
      previewUrl: z.string().url().optional(),
      modelUrl: z.string().url().optional(),
      voiceId: z.string().nullable().optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
  }),
);

/* ------------------------------------------------------------------ */
/*  Brand kits                                                         */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/brand-kits',
    model: 'brandKit',
    ownerField: 'userId',
    searchFields: ['name'],
    createSchema: z.object({
      name: z.string().min(1).max(120),
      colors: z.array(z.unknown()).default([]),
      fonts: z.array(z.unknown()).default([]),
      logoUrl: z.string().url().optional(),
      sonicUrl: z.string().url().optional(),
      isDefault: z.boolean().default(false),
    }),
    updateSchema: z.object({
      name: z.string().min(1).max(120).optional(),
      colors: z.array(z.unknown()).optional(),
      fonts: z.array(z.unknown()).optional(),
      logoUrl: z.string().url().nullable().optional(),
      sonicUrl: z.string().url().nullable().optional(),
      isDefault: z.boolean().optional(),
      projectIds: z.array(z.string()).optional(),
    }),
  }),
);

/* ------------------------------------------------------------------ */
/*  Scripts                                                            */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/scripts',
    model: 'script',
    ownerField: 'userId',
    searchFields: ['title', 'content'],
    createSchema: z.object({
      title: z.string().min(1).max(200),
      projectId: z.string().optional(),
      format: z.enum(['screenplay', 'storyboard', 'outline']).default('screenplay'),
      content: z.string().default(''),
      structure: z.record(z.unknown()).default({}),
    }),
    updateSchema: z.object({
      title: z.string().min(1).max(200).optional(),
      projectId: z.string().nullable().optional(),
      format: z.enum(['screenplay', 'storyboard', 'outline']).optional(),
      content: z.string().optional(),
      structure: z.record(z.unknown()).optional(),
      status: z.enum(['draft', 'final']).optional(),
    }),
  }),
);

/* ------------------------------------------------------------------ */
/*  Markers                                                            */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/markers',
    model: 'marker',
    ownerField: 'userId',
    searchFields: ['label', 'note'],
    orderBy: { timeMs: 'asc' },
    createSchema: z.object({
      projectId: z.string().min(1),
      shotId: z.string().optional(),
      label: z.string().min(1).max(200),
      timeMs: z.number().int().min(0),
      color: z.string().default('#7c3aed'),
      note: z.string().optional(),
    }),
    updateSchema: z.object({
      label: z.string().min(1).max(200).optional(),
      timeMs: z.number().int().min(0).optional(),
      color: z.string().optional(),
      note: z.string().nullable().optional(),
    }),
  }),
);

/* ------------------------------------------------------------------ */
/*  Custom domains                                                     */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/custom-domains',
    model: 'customDomain',
    ownerField: 'userId',
    searchFields: ['domain'],
    createSchema: z.object({
      domain: z
        .string()
        .min(3)
        .max(253)
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Must be a hostname'),
      projectId: z.string().optional(),
      // Generated server-side; the client cannot choose its own proof.
      verifyToken: z.string().default(''),
    }),
    updateSchema: z.object({
      projectId: z.string().nullable().optional(),
      status: z.enum(['pending', 'verifying', 'active', 'failed']).optional(),
    }),
  }),
);

/* ------------------------------------------------------------------ */
/*  Asset folders                                                      */
/* ------------------------------------------------------------------ */

router.use(
  crudRouter({
    path: '/asset-folders',
    model: 'assetFolder',
    ownerField: 'userId',
    searchFields: ['name'],
    orderBy: { name: 'asc' },
    createSchema: z.object({
      name: z.string().min(1).max(120),
      parentId: z.string().optional(),
    }),
    updateSchema: z.object({
      name: z.string().min(1).max(120).optional(),
      parentId: z.string().nullable().optional(),
    }),
  }),
);

/* ------------------------------------------------------------------ */
/*  Voices                                                             */
/* ------------------------------------------------------------------ */
// ownerField is null: the catalogue is shared. Cloned voices carry a userId and
// are filtered by the route below rather than by the factory.

router.use(
  crudRouter({
    path: '/voices',
    model: 'voice',
    ownerField: null,
    searchFields: ['name', 'language'],
    orderBy: { name: 'asc' },
    createSchema: z.object({
      name: z.string().min(1).max(120),
      provider: z.string().default('builtin'),
      language: z.string().default('en-US'),
      gender: z.string().optional(),
      previewUrl: z.string().url().optional(),
      isCloned: z.boolean().default(false),
      userId: z.string().optional(),
      metadata: z.record(z.unknown()).default({}),
    }),
    updateSchema: z.object({
      name: z.string().min(1).max(120).optional(),
      previewUrl: z.string().url().nullable().optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
  }),
);

export default router;
