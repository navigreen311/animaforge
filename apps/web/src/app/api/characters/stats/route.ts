import { proxy } from '@/lib/api/proxy';

// The four counters on the characters page header.
export const GET = proxy('GET', '/api/v1/characters/stats');
