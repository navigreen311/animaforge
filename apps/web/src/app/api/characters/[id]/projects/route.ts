import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/characters/[id]/projects',
  'attaching a character to projects has no endpoint yet',
);

export const POST = handler;
