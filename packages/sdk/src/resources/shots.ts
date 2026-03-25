import type { HttpClient } from '../http';
import type {
  Shot,
  CreateShotData,
  UpdateShotData,
  PaginatedResponse,
} from '../types';

export class ShotsResource {
  constructor(private readonly http: HttpClient) {}

  async list(projectId: string): Promise<PaginatedResponse<Shot>> {
    return this.http.get(`/projects/${projectId}/shots`);
  }

  async get(id: string): Promise<Shot> {
    return this.http.get(`/shots/${id}`);
  }

  async create(sceneId: string, data: CreateShotData): Promise<Shot> {
    return this.http.post(`/scenes/${sceneId}/shots`, data);
  }

  async update(id: string, data: UpdateShotData): Promise<Shot> {
    return this.http.patch(`/shots/${id}`, data);
  }

  async approve(id: string): Promise<Shot> {
    return this.http.post(`/shots/${id}/approve`);
  }

  async lock(id: string): Promise<Shot> {
    return this.http.post(`/shots/${id}/lock`);
  }
}
