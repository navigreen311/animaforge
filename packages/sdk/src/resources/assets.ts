import type { HttpClient } from '../http';
import type {
  Asset,
  ListAssetsParams,
  SearchAssetsParams,
  UploadAssetData,
  PaginatedResponse,
} from '../types';

export class AssetsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params?: ListAssetsParams): Promise<PaginatedResponse<Asset>> {
    return this.http.get('/assets', params as Record<string, string | number | boolean | undefined>);
  }

  async search(params: SearchAssetsParams): Promise<PaginatedResponse<Asset>> {
    return this.http.get('/assets/search', params as unknown as Record<string, string | number | boolean | undefined>);
  }

  async upload(data: UploadAssetData): Promise<Asset> {
    // Request a presigned upload URL, then upload the file
    const presigned = await this.http.post<{ uploadUrl: string; assetId: string }>(
      '/assets/upload',
      {
        name: data.name,
        projectId: data.projectId,
        mimeType: data.mimeType,
        metadata: data.metadata,
      }
    );

    // Upload file to presigned URL
    await fetch(presigned.uploadUrl, {
      method: 'PUT',
      body: data.file as BodyInit,
      headers: { 'Content-Type': data.mimeType },
    });

    // Confirm upload and get the asset
    return this.http.post(`/assets/${presigned.assetId}/confirm`);
  }
}
