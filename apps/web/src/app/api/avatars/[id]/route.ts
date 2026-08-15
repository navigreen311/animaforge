import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/avatars/[id]');
export const PATCH = proxy('PATCH', '/api/v1/avatars/[id]');
export const DELETE = proxy('DELETE', '/api/v1/avatars/[id]');
