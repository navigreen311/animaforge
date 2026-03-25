import { v4 as uuidv4 } from "uuid";
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../models/characterSchemas.js";

const characters: Map<string, Character> = new Map();

export function clearCharacters(): void {
  characters.clear();
}

export function createCharacter(
  input: CreateCharacterInput,
  ownerId: string
): Character {
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

export function listCharacters(query: ListCharactersQuery) {
  let results = Array.from(characters.values());

  if (query.projectId) {
    results = results.filter((c) => c.projectId === query.projectId);
  }
  if (query.ownerId) {
    results = results.filter((c) => c.ownerId === query.ownerId);
  }

  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const total = results.length;
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);

  return { items, total, page, limit };
}

export function getCharacterById(id: string): Character | undefined {
  return characters.get(id);
}

export function updateCharacter(
  id: string,
  input: UpdateCharacterInput
): Character | undefined {
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

export function deleteCharacter(id: string): boolean {
  return characters.delete(id);
}

export function triggerDigitalTwin(id: string): { jobId: string } | undefined {
  const character = characters.get(id);
  if (!character) return undefined;

  // Mark as digital twin
  character.isDigitalTwin = true;
  character.updatedAt = new Date().toISOString();

  return { jobId: uuidv4() };
}
