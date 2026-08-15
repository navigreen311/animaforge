import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/api-keys/usage',
  'per-key usage counters are not recorded; see docs/persistence.md section 7',
);

export const GET = handler;
