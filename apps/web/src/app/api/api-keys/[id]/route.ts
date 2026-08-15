import { proxy } from '@/lib/api/proxy';

export const DELETE = proxy('DELETE', '/api/v1/api-keys/[id]');
