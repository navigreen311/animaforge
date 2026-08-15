import { proxy } from '@/lib/api/proxy';

export const PATCH = proxy('PUT', '/api/v1/projects/[id]');
export const DELETE = proxy('DELETE', '/api/v1/projects/[id]');
