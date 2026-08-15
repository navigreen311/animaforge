import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/users/me/sessions');
