import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/projects/[id]/reviews');
