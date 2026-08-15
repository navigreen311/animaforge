import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/upload/avatar',
  'it requires object storage, which is not configured (see STORAGE_* in .env.example)',
);

export const POST = handler;
