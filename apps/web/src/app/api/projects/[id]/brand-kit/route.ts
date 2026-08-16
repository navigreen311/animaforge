import { proxy } from '@/lib/api/proxy';

// The brand kit is a JSON column on the project.
export const GET = proxy('GET', '/api/v1/projects/[id]/brand-kit');
export const PUT = proxy('PUT', '/api/v1/projects/[id]/brand-kit');
