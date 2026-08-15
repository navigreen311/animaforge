import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/live/sessions/[id]');
export const PATCH = proxy('PATCH', '/api/v1/live/sessions/[id]');
