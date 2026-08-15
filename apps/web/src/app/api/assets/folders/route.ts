import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/asset-folders');
export const POST = proxy('POST', '/api/v1/asset-folders');
