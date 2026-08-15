import { proxy } from '@/lib/api/proxy';

export const DELETE = proxy('DELETE', '/api/v1/users/me/sessions/[id]');
