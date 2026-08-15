import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/characters/[id]/export',
  'export rendering requires the export service and object storage, neither of which is configured',
);

export const POST = handler;
