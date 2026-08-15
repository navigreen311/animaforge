import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/webhooks/[id]/test',
  'sending a test delivery has no endpoint yet',
);

export const POST = handler;
