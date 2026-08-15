import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/characters/[id]');
export const PATCH = proxy('PUT', '/api/v1/characters/[id]');
export const DELETE = proxy('DELETE', '/api/v1/characters/[id]');
