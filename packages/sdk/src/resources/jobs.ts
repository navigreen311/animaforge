import type { HttpClient } from '../http';
import type { Job, ListJobsParams, PaginatedResponse } from '../types';

export class JobsResource {
  constructor(private readonly http: HttpClient) {}

  async get(id: string): Promise<Job> {
    return this.http.get(`/jobs/${id}`);
  }

  async cancel(id: string): Promise<Job> {
    return this.http.post(`/jobs/${id}/cancel`);
  }

  async list(params?: ListJobsParams): Promise<PaginatedResponse<Job>> {
    return this.http.get('/jobs', params as Record<string, string | number | boolean | undefined>);
  }

  async waitForCompletion(id: string, pollInterval = 2000): Promise<Job> {
    const terminalStatuses = new Set(['completed', 'failed', 'cancelled']);

    while (true) {
      const job = await this.get(id);

      if (terminalStatuses.has(job.status)) {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
