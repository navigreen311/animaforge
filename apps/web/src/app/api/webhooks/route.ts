import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/webhook-endpoints');
export const POST = proxy('POST', '/api/v1/webhook-endpoints');
