import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/assets/bulk-download',
  'it requires object storage, which is not configured (see STORAGE_* in .env.example)',
);

export const POST = handler;
