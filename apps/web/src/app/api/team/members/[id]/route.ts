import { proxy } from '@/lib/api/proxy';

export const PATCH = proxy('PATCH', '/api/v1/team/members/[id]');
export const DELETE = proxy('DELETE', '/api/v1/team/members/[id]');
