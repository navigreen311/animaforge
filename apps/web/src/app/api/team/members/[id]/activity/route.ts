import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/team/members/[id]/activity',
  'per-member activity has no endpoint yet',
);

export const GET = handler;
