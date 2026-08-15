import { notImplemented } from '@/lib/api/proxy';

const handler = notImplemented(
  '/api/brand-kits/extract-colors',
  'it requires the AI inference service (services/ai-api), which this change does not touch',
);

export const POST = handler;
