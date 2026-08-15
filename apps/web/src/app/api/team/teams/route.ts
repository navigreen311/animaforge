import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/teams', { envelope: 'teams' });
export const POST = proxy('POST', '/api/v1/teams');
