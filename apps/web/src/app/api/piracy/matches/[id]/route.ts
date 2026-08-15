import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/piracy/matches/[id]');
export const PATCH = proxy('PATCH', '/api/v1/piracy/matches/[id]');
