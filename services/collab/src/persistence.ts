import * as Y from 'yjs';
import fs from 'node:fs';
import path from 'node:path';

const PERSISTENCE_DIR = process.env.COLLAB_PERSISTENCE_DIR || './collab-data';
const DEBOUNCE_MS = 5000;

const memoryStore = new Map<string, Uint8Array>();
const saveTimers = new Map<string, NodeJS.Timeout>();
const useFilePersistence = process.env.COLLAB_PERSISTENCE !== 'memory';

export function initPersistence(projectId: string, doc: Y.Doc): void {
  const existingState = loadState(projectId);
  if (existingState) {
    Y.applyUpdate(doc, existingState);
  }
  doc.on('update', () => { debouncedSave(projectId, doc); });
}

function debouncedSave(projectId: string, doc: Y.Doc): void {
  const existing = saveTimers.get(projectId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    saveState(projectId, doc);
    saveTimers.delete(projectId);
  }, DEBOUNCE_MS);
  saveTimers.set(projectId, timer);
}

function saveState(projectId: string, doc: Y.Doc): void {
  const state = Y.encodeStateAsUpdate(doc);
  if (useFilePersistence) {
    try {
      const dir = path.resolve(PERSISTENCE_DIR);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, sanitizeFileName(projectId) + '.yjs');
      fs.writeFileSync(filePath, Buffer.from(state));
    } catch (err) {
      console.error('[collab] Failed to save state for ' + projectId + ':', err);
      memoryStore.set(projectId, state);
    }
  } else {
    memoryStore.set(projectId, state);
  }
}

function loadState(projectId: string): Uint8Array | null {
  if (useFilePersistence) {
    try {
      const filePath = path.join(path.resolve(PERSISTENCE_DIR), sanitizeFileName(projectId) + '.yjs');
      if (fs.existsSync(filePath)) return new Uint8Array(fs.readFileSync(filePath));
    } catch (err) {
      console.error('[collab] Failed to load state for ' + projectId + ':', err);
    }
  }
  return memoryStore.get(projectId) || null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function flushAll(): void {
  for (const [, timer] of saveTimers.entries()) clearTimeout(timer);
  saveTimers.clear();
}

export { memoryStore, loadState, saveState };
