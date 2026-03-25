import type { HttpClient } from '../http';
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ListProjectsParams,
  PaginatedResponse,
  WorldBible,
  BrandKit,
} from '../types';

export class ProjectsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params?: ListProjectsParams): Promise<PaginatedResponse<Project>> {
    return this.http.get('/projects', params as Record<string, string | number | boolean | undefined>);
  }

  async get(id: string): Promise<Project> {
    return this.http.get(`/projects/${id}`);
  }

  async create(data: CreateProjectData): Promise<Project> {
    return this.http.post('/projects', data);
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    return this.http.patch(`/projects/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete(`/projects/${id}`);
  }

  async updateWorldBible(id: string, bible: WorldBible): Promise<Project> {
    return this.http.put(`/projects/${id}/world-bible`, bible);
  }

  async updateBrandKit(id: string, kit: BrandKit): Promise<Project> {
    return this.http.put(`/projects/${id}/brand-kit`, kit);
  }
}
