import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/projects/[id]/duplicate',
  'duplicating a project copies scenes, shots and assets and has no endpoint yet',
);

export const POST = handler;
