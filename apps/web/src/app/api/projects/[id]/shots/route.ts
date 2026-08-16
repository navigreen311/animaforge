import { proxy } from '@/lib/api/proxy';

// Shot picker data. Reads only; a shot is created through the scene it belongs
// to, not from here.
export const GET = proxy('GET', '/api/v1/projects/[id]/shots');
