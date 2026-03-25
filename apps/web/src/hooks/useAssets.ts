import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Asset {
  id: string;
  projectId: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'model' | 'other';
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const assetKeys = {
  all: ['assets'] as const,
  list: (projectId: string, type?: string) =>
    [...assetKeys.all, 'list', projectId, type] as const,
  search: (query: string) => [...assetKeys.all, 'search', query] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useAssets(projectId: string | undefined, type?: string) {
  return useQuery({
    queryKey: assetKeys.list(projectId!, type),
    queryFn: () =>
      apiClient.get<Asset[]>('/api/v1/assets', {
        params: {
          projectId: projectId!,
          ...(type ? { type } : {}),
        },
      }),
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useSearchAssets(query: string) {
  return useQuery({
    queryKey: assetKeys.search(query),
    queryFn: () =>
      apiClient.get<Asset[]>('/api/v1/assets/search', {
        params: { q: query },
      }),
    enabled: query.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useUploadAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      return apiClient.upload<Asset>('/api/v1/assets', formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
