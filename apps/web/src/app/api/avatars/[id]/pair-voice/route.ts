import { proxy } from '@/lib/api/proxy';

export const POST = proxy('PATCH', '/api/v1/avatars/[id]');
