import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Project } from '@/types';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (page: number, limit: number, status?: string) =>
    [...projectKeys.lists(), { page, limit, status }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

type CreateProjectInput = Pick<Project, 'name' | 'description'>;
type UpdateProjectInput = Partial<Pick<Project, 'name' | 'description'>>;

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useProjects(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: projectKeys.list(page, limit, status),
    queryFn: () =>
      apiClient.get<ProjectListResponse>('/api/v1/projects', {
        params: {
          page: String(page),
          limit: String(limit),
          ...(status ? { status } : {}),
        },
      }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => apiClient.get<Project>(`/api/v1/projects/${id}`),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiClient.post<Project>('/api/v1/projects', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProjectInput & { id: string }) =>
      apiClient.put<Project>(`/api/v1/projects/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/v1/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
