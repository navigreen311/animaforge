import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/brand-kits/fonts',
  'the font catalogue is not modelled; see docs/persistence.md section 7',
);

export const GET = handler;
