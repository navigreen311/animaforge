import { proxy } from '@/lib/api/proxy';

export const POST = proxy('POST', '/api/v1/projects/[id]/brand-kit/guide');
