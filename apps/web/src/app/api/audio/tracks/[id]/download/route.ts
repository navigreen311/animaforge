import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/audio/tracks/[id]/download',
  'it requires object storage, which is not configured (see STORAGE_* in .env.example)',
);

export const GET = handler;
