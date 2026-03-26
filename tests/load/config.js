export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';
export const headers = { 'Authorization': `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' };
