import { proxy } from '@/lib/api/proxy';

export const PATCH = proxy('PATCH', '/api/v1/markers/[id]');
export const DELETE = proxy('DELETE', '/api/v1/markers/[id]');
