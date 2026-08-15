import { proxy } from '@/lib/api/proxy';

export const POST = proxy('POST', '/api/v1/marketplace/wishlist/[id]');
export const DELETE = proxy('DELETE', '/api/v1/marketplace/wishlist/[id]');
