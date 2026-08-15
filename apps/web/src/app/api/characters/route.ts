import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/characters');
export const POST = proxy('POST', '/api/v1/characters');
