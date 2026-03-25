import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db.js";
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../models/characterSchemas.js";

// In-memory fallback store
const characters: Map<string, Character> = new Map();

export function clearCharacters(): void {
  characters.clear();
}

export async function createCharacter(
  input: CreateCharacterInput,
  ownerId: string,
): Promise<Character> {
  if (prisma) {
    return prisma.character.create({
      data: {
        ...input,
        ownerId,
        rightsStatus: "original",
        styleMode: input.styleMode ?? undefined,
        isDigitalTwin: input.isDigitalTwin ?? false,
      },
    }) as unknown as Character;
  }

  // In-memory fallback
  const now = new Date().toISOString();
  const character: Character = {
    id: uuidv4(),
    ownerId,
    rightsStatus: "original",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  characters.set(character.id, character);
  return character;
}

export interface ListCharactersQuery {
  projectId?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
}

export async function listCharacters(query: ListCharactersQuery) {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

  if (prisma) {
    const where: Record<string, unknown> = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.ownerId) where.ownerId = query.ownerId;

    const [items, total] = await Promise.all([
      prisma.character.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.character.count({ where }),
    ]);

    return { items: items as unknown as Character[], total, page, limit };
  }

  // In-memory fallback
  let results = Array.from(characters.values());

  if (query.projectId) {
    results = results.filter((c) => c.projectId === query.projectId);
  }
  if (query.ownerId) {
    results = results.filter((c) => c.ownerId === query.ownerId);
  }

  const total = results.length;
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);

  return { items, total, page, limit };
}

export async function getCharacterById(id: string): Promise<Character | undefined> {
  if (prisma) {
    const character = await prisma.character.findUnique({ where: { id } });
    return (character ?? undefined) as Character | undefined;
  }

  // In-memory fallback
  return characters.get(id);
}

export async function updateCharacter(
  id: string,
  input: UpdateCharacterInput,
): Promise<Character | undefined> {
  if (prisma) {
    const existing = await prisma.character.findUnique({ where: { id } });
    if (!existing) return undefined;

    const updated = await prisma.character.update({
      where: { id },
      data: {
        ...input,
        // Preserve immutable fields
        id: undefined,
        ownerId: undefined,
        createdAt: undefined,
      },
    });
    return updated as unknown as Character;
  }

  // In-memory fallback
  const existing = characters.get(id);
  if (!existing) return undefined;

  const updated: Character = {
    ...existing,
    ...input,
    id: existing.id,
    ownerId: existing.ownerId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  characters.set(id, updated);
  return updated;
}

export async function deleteCharacter(id: string): Promise<boolean> {
  if (prisma) {
    const existing = await prisma.character.findUnique({ where: { id } });
    if (!existing) return false;

    await prisma.character.delete({ where: { id } });
    return true;
  }

  // In-memory fallback
  return characters.delete(id);
}

export async function triggerDigitalTwin(id: string): Promise<{ jobId: string } | undefined> {
  if (prisma) {
    const character = await prisma.character.findUnique({ where: { id } });
    if (!character) return undefined;

    await prisma.character.update({
      where: { id },
      data: { isDigitalTwin: true },
    });

    return { jobId: uuidv4() };
  }

  // In-memory fallback
  const character = characters.get(id);
  if (!character) return undefined;

  character.isDigitalTwin = true;
  character.updatedAt = new Date().toISOString();

  return { jobId: uuidv4() };
}
