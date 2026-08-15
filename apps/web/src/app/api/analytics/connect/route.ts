import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/analytics/connect',
  'connecting an external analytics source has no endpoint yet',
);

export const POST = handler;
