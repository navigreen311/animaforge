import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/scripts');
export const POST = proxy('POST', '/api/v1/scripts');
