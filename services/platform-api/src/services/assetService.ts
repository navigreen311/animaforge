import { v4 as uuidv4 } from "uuid";
import type { Asset, CreateAssetInput } from "../models/assetSchemas.js";

const assets: Map<string, Asset> = new Map();

export function clearAssets(): void {
  assets.clear();
}

export function createAsset(input: CreateAssetInput, ownerId: string): Asset {
  const now = new Date().toISOString();
  const asset: Asset = {
    id: uuidv4(),
    ownerId,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  assets.set(asset.id, asset);
  return asset;
}

export interface ListAssetsQuery {
  projectId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function listAssets(query: ListAssetsQuery) {
  let results = Array.from(assets.values());

  if (query.projectId) {
    results = results.filter((a) => a.projectId === query.projectId);
  }
  if (query.type) {
    results = results.filter((a) => a.type === query.type);
  }

  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const total = results.length;
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);

  return { items, total, page, limit };
}

export function getAssetById(id: string): Asset | undefined {
  return assets.get(id);
}

export function deleteAsset(id: string): boolean {
  return assets.delete(id);
}

export function searchAssets(q: string) {
  // Semantic search stub — simple substring match on name for now
  const results = Array.from(assets.values()).filter((a) =>
    a.name.toLowerCase().includes(q.toLowerCase())
  );
  return { items: results, total: results.length, query: q };
}
