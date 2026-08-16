import { proxy } from '@/lib/api/proxy';

export const GET = proxy('GET', '/api/v1/jobs');

// Submitting a generation job. The row is created and the work is queued in
// one call; the response carries the queued job so the console can show it
// immediately. See docs/auth.md and services/platform-api/src/lib/
// generationQueue.ts for the producer/consumer contract.
export const POST = proxy('POST', '/api/v1/jobs');
