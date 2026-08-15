import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/piracy/scanners',
  'scanner configuration lives in services/piracy and has no console endpoint yet',
);

export const GET = handler;
