import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db.js";
import type { Asset, CreateAssetInput } from "../models/assetSchemas.js";

// In-memory fallback store
const assets: Map<string, Asset> = new Map();

export function clearAssets(): void {
  assets.clear();
}

export async function createAsset(input: CreateAssetInput, ownerId: string): Promise<Asset> {
  if (prisma) {
    return prisma.asset.create({
      data: {
        ...input,
        ownerId,
      },
    }) as unknown as Asset;
  }

  // In-memory fallback
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

export async function listAssets(query: ListAssetsQuery) {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

  if (prisma) {
    const where: Record<string, unknown> = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.type) where.type = query.type;

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.count({ where }),
    ]);

    return { items: items as unknown as Asset[], total, page, limit };
  }

  // In-memory fallback
  let results = Array.from(assets.values());

  if (query.projectId) {
    results = results.filter((a) => a.projectId === query.projectId);
  }
  if (query.type) {
    results = results.filter((a) => a.type === query.type);
  }

  const total = results.length;
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);

  return { items, total, page, limit };
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  if (prisma) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    return (asset ?? undefined) as Asset | undefined;
  }

  // In-memory fallback
  return assets.get(id);
}

export async function deleteAsset(id: string): Promise<boolean> {
  if (prisma) {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) return false;

    await prisma.asset.delete({ where: { id } });
    return true;
  }

  // In-memory fallback
  return assets.delete(id);
}

export async function searchAssets(q: string) {
  if (prisma) {
    const items = await prisma.asset.findMany({
      where: {
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { items: items as unknown as Asset[], total: items.length, query: q };
  }

  // In-memory fallback
  const results = Array.from(assets.values()).filter((a) =>
    a.name.toLowerCase().includes(q.toLowerCase()),
  );
  return { items: results, total: results.length, query: q };
}
