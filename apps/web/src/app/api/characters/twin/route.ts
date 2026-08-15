import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/characters/twin',
  'it requires the AI inference service (services/ai-api), which this change does not touch',
);

export const POST = handler;
