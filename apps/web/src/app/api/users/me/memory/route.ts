import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/users/me/memory');
export const PATCH = proxy('PATCH', '/api/v1/users/me/memory');
export const DELETE = proxy('DELETE', '/api/v1/users/me/memory');
