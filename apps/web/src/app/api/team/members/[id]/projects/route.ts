import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/team/members/[id]/projects',
  'assigning projects to a member has no endpoint yet',
);

export const PATCH = handler;
