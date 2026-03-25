import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Shot } from '@/types';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const shotKeys = {
  all: ['shots'] as const,
  byProject: (projectId: string) => [...shotKeys.all, 'project', projectId] as const,
  detail: (id: string) => [...shotKeys.all, 'detail', id] as const,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CreateShotInput = Omit<Shot, 'id' | 'status' | 'thumbnailUrl' | 'outputUrl'> & {
  sceneId: string;
};

type UpdateShotInput = Partial<
  Pick<Shot, 'subject' | 'camera' | 'action' | 'emotion' | 'timing' | 'dialogue' | 'durationSec' | 'characterRefs' | 'styleRef'>
>;

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useShots(projectId: string | undefined) {
  return useQuery({
    queryKey: shotKeys.byProject(projectId!),
    queryFn: () =>
      apiClient.get<Shot[]>(`/api/v1/projects/${projectId}/shots`),
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useShot(id: string | undefined) {
  return useQuery({
    queryKey: shotKeys.detail(id!),
    queryFn: () => apiClient.get<Shot>(`/api/v1/shots/${id}`),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateShot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ sceneId, ...data }: CreateShotInput) =>
      apiClient.post<Shot>(`/api/v1/scenes/${sceneId}/shots`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shotKeys.all });
    },
  });
}

export function useUpdateShot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateShotInput & { id: string }) =>
      apiClient.put<Shot>(`/api/v1/shots/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: shotKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: shotKeys.all });
    },
  });
}

export function useApproveShot() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.put<Shot>(`/api/v1/shots/${id}/approve`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: shotKeys.detail(id) });
      qc.invalidateQueries({ queryKey: shotKeys.all });
    },
  });
}
