import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Scene } from '@/types';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const sceneKeys = {
  all: ['scenes'] as const,
  byProject: (projectId: string) => [...sceneKeys.all, 'project', projectId] as const,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CreateSceneInput = Pick<Scene, 'name' | 'order'> & { projectId: string };
type UpdateSceneInput = Partial<Pick<Scene, 'name' | 'order'>> & { id: string };

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useScenes(projectId: string | undefined) {
  return useQuery({
    queryKey: sceneKeys.byProject(projectId!),
    queryFn: () =>
      apiClient.get<Scene[]>(`/api/v1/projects/${projectId}/scenes`),
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateScene() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, ...data }: CreateSceneInput) =>
      apiClient.post<Scene>(`/api/v1/projects/${projectId}/scenes`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sceneKeys.all });
    },
  });
}

export function useUpdateScene() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateSceneInput) =>
      apiClient.put<Scene>(`/api/v1/scenes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sceneKeys.all });
    },
  });
}
