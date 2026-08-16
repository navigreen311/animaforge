import { proxy } from '@/lib/api/proxy';

// The world bible is a JSON column on the project; platform-api validates it as
// an open object, so whatever the settings page models lands intact.
export const PUT = proxy('PUT', '/api/v1/projects/[id]/world-bible');
