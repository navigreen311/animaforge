import * as Y from 'yjs';
import fs from 'node:fs';
import path from 'node:path';

const PERSISTENCE_DIR = process.env.COLLAB_PERSISTENCE_DIR || './collab-data';
const DEBOUNCE_MS = 5000;
const memoryStore = new Map<string, Uint8Array>();
const saveTimers = new Map<string, NodeJS.Timeout>();
const useFilePersistence = process.env.COLLAB_PERSISTENCE !== 'memory';

export function initPersistence(projectId: string, doc: Y.Doc): void {
  const existing = loadState(projectId);
  if (existing) Y.applyUpdate(doc, existing);
  doc.on('update', () => { debouncedSave(projectId, doc); });
}

function debouncedSave(projectId: string, doc: Y.Doc): void {
  const t = saveTimers.get(projectId); if (t) clearTimeout(t);
  saveTimers.set(projectId, setTimeout(() => { saveState(projectId, doc); saveTimers.delete(projectId); }, DEBOUNCE_MS));
}

function saveState(projectId: string, doc: Y.Doc): void {
  const state = Y.encodeStateAsUpdate(doc);
  if (useFilePersistence) {
    try {
      const dir = path.resolve(PERSISTENCE_DIR);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, sanitize(projectId) + '.yjs'), Buffer.from(state));
    } catch (e) { console.error('[collab] save fail:', e); memoryStore.set(projectId, state); }
  } else { memoryStore.set(projectId, state); }
}

function loadState(projectId: string): Uint8Array | null {
  if (useFilePersistence) {
    try {
      const fp = path.join(path.resolve(PERSISTENCE_DIR), sanitize(projectId) + '.yjs');
      if (fs.existsSync(fp)) return new Uint8Array(fs.readFileSync(fp));
    } catch (e) { console.error('[collab] load fail:', e); }
  }
  return memoryStore.get(projectId) || null;
}

function sanitize(n: string): string { return n.replace(/[^a-zA-Z0-9_-]/g, '_'); }
export function flushAll(): void { for (const [, t] of saveTimers) clearTimeout(t); saveTimers.clear(); }
export { memoryStore, loadState, saveState };
