import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/assets/[id]/use-in-shot',
  'attaching an asset to a shot has no endpoint yet',
);

export const POST = handler;
