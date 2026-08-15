import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/api-keys');
export const POST = proxy('POST', '/api/v1/api-keys');
