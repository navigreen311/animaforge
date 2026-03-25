import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimaForgeClient } from '../client';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  InsufficientCreditsError,
} from '../errors';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  };
}

describe('AnimaForgeClient', () => {
  let client: AnimaForgeClient;

  beforeEach(() => {
    mockFetch.mockReset();
    // Create client with 0 retries to avoid retry complications in most tests
    client = new AnimaForgeClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com/v1',
      maxRetries: 0,
    });
  });

  it('throws if apiKey is not provided', () => {
    expect(() => new AnimaForgeClient({ apiKey: '' })).toThrow('apiKey is required');
  });

  it('lists projects', async () => {
    const mockData = { data: [{ id: 'p1', name: 'Project 1' }], total: 1, page: 1, limit: 20, hasMore: false };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

    const result = await client.projects.list();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('p1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/projects'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('creates a project with correct body', async () => {
    const mockProject = { id: 'p2', name: 'New Project', status: 'draft', createdAt: '', updatedAt: '' };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockProject));

    const result = await client.projects.create({ name: 'New Project' });
    expect(result.id).toBe('p2');

    const [, fetchOpts] = mockFetch.mock.calls[0];
    expect(fetchOpts.method).toBe('POST');
    expect(JSON.parse(fetchOpts.body)).toEqual({ name: 'New Project' });
  });

  it('sends auth header on every request', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'p1' }));

    await client.projects.get('p1');

    const [, fetchOpts] = mockFetch.mock.calls[0];
    expect(fetchOpts.headers.Authorization).toBe('Bearer test-key');
  });

  it('throws AuthenticationError on 401', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401));

    await expect(client.projects.get('p1')).rejects.toThrow(AuthenticationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Not found' }, 404));

    await expect(client.projects.get('missing')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429 with no retries', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: 'Too many requests' }, 429, { 'retry-after': '5' })
    );

    await expect(client.projects.list()).rejects.toThrow(RateLimitError);
  });

  it('throws InsufficientCreditsError on 402', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'No credits' }, 402));

    await expect(client.generate.video({ projectId: 'p1', prompt: 'test' })).rejects.toThrow(
      InsufficientCreditsError
    );
  });

  it('generates video and returns jobId', async () => {
    const mockResult = { jobId: 'job-123', estimatedSeconds: 120 };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockResult));

    const result = await client.generate.video({
      projectId: 'p1',
      prompt: 'A sunset scene',
      resolution: '1080p',
    });

    expect(result.jobId).toBe('job-123');
    expect(result.estimatedSeconds).toBe(120);
  });

  it('approves a shot', async () => {
    const mockShot = { id: 's1', status: 'approved' };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockShot));

    const result = await client.shots.approve('s1');
    expect(result.status).toBe('approved');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/shots/s1/approve');
    expect(opts.method).toBe('POST');
  });

  it('retries on 500 errors then succeeds', async () => {
    // Create a client with 1 retry for this test
    const retryClient = new AnimaForgeClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com/v1',
      maxRetries: 1,
    });

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Internal error' }, 500))
      .mockResolvedValueOnce(jsonResponse({ id: 'j1', status: 'completed' }));

    const result = await retryClient.jobs.get('j1');
    expect(result.status).toBe('completed');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 10000);
});
