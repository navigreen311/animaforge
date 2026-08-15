import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/styles/img-to-cartoon',
  'it requires the AI inference service (services/ai-api), which this change does not touch',
);

export const POST = handler;
