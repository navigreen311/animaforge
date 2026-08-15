import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/audio/tracks/[id]/add-to-project',
  'moving a track between projects has no endpoint yet',
);

export const POST = handler;
