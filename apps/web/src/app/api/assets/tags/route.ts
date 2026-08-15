import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/assets/tags',
  'asset tags are not modelled; see docs/persistence.md section 7',
);

export const GET = handler;
