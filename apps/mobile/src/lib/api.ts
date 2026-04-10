import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:4000/api'
  : 'https://api.animaforge.com/api';

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(authenticated: boolean): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Client': 'animaforge-mobile',
    };

    if (authenticated) {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { authenticated = true, ...fetchOptions } = options;
    const headers = await this.getHeaders(authenticated);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers: {
        ...headers,
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError(response.status, error.message || 'Request failed');
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = new ApiClient(API_BASE_URL);

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  status: 'active' | 'archived' | 'draft';
}

export interface Shot {
  id: string;
  projectId: string;
  name: string;
  status: 'pending' | 'rendering' | 'review' | 'approved' | 'rejected';
  previewUrl?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  shotId?: string;
  projectId?: string;
  type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  progress?: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

// ---------------------------------------------------------------------------
// TanStack Query helpers
// ---------------------------------------------------------------------------

export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  shots: (projectId: string) => ['projects', projectId, 'shots'] as const,
  shot: (id: string) => ['shots', id] as const,
  jobs: ['jobs'] as const,
};

export function listProjects(): Promise<Project[]> {
  return api.get<Project[]>('/projects');
}

export function getProject(projectId: string): Promise<Project> {
  return api.get<Project>(`/projects/${projectId}`);
}

export function listShots(projectId: string): Promise<Shot[]> {
  return api.get<Shot[]>(`/projects/${projectId}/shots`);
}

export function getShot(shotId: string): Promise<Shot> {
  return api.get<Shot>(`/shots/${shotId}`);
}

export function approveShot(shotId: string, notes?: string): Promise<Shot> {
  return api.post<Shot>(`/shots/${shotId}/approve`, { notes });
}

export function listJobs(params?: { status?: Job['status']; projectId?: string }): Promise<Job[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.projectId) search.set('projectId', params.projectId);
  const query = search.toString();
  return api.get<Job[]>(`/jobs${query ? `?${query}` : ''}`);
}
