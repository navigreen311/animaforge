import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/styles/[id]');
export const DELETE = proxy('DELETE', '/api/v1/styles/[id]');
