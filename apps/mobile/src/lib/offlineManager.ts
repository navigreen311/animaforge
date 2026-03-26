import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { api } from './api';
import { cacheImage } from './cacheManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OfflineProject {
  projectId: string;
  name: string;
  data: Record<string, unknown>;
  thumbnailPath: string | null;
  cachedAt: string;
}

export interface StorageUsage {
  used: number;
  available: number;
  projects: { name: string; size: number }[];
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_PROJECTS = '@animaforge/offline_projects';
const STORAGE_KEY_ACTIONS = '@animaforge/offline_actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readProjects(): Promise<OfflineProject[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_PROJECTS);
  return raw ? (JSON.parse(raw) as OfflineProject[]) : [];
}

async function writeProjects(projects: OfflineProject[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}

async function readActions(): Promise<OfflineAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_ACTIONS);
  return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
}

async function writeActions(actions: OfflineAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actions));
}

function estimateSize(obj: unknown): number {
  return new Blob([JSON.stringify(obj)]).size;
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

/**
 * Returns true when the device has no usable internet connection.
 */
export async function isOffline(): Promise<boolean> {
  const state: NetInfoState = await NetInfo.fetch();
  return !(state.isConnected && state.isInternetReachable !== false);
}

// ---------------------------------------------------------------------------
// Project sync
// ---------------------------------------------------------------------------

/**
 * Download a project's data and thumbnail for offline use.
 */
export async function syncProject(projectId: string): Promise<void> {
  const projectData = await api.get<{
    id: string;
    name: string;
    thumbnailUrl?: string;
    [key: string]: unknown;
  }>(`/projects/${projectId}`);

  let thumbnailPath: string | null = null;
  if (projectData.thumbnailUrl) {
    thumbnailPath = await cacheImage(projectData.thumbnailUrl);
  }

  const entry: OfflineProject = {
    projectId,
    name: projectData.name,
    data: projectData,
    thumbnailPath,
    cachedAt: new Date().toISOString(),
  };

  const projects = await readProjects();
  const idx = projects.findIndex((p) => p.projectId === projectId);
  if (idx >= 0) {
    projects[idx] = entry;
  } else {
    projects.push(entry);
  }
  await writeProjects(projects);
}

/**
 * Return all locally cached projects.
 */
export async function getOfflineProjects(): Promise<OfflineProject[]> {
  return readProjects();
}

// ---------------------------------------------------------------------------
// Action queue
// ---------------------------------------------------------------------------

/**
 * Enqueue an action to be replayed when back online.
 */
export async function queueAction(
  action: Omit<OfflineAction, 'id' | 'createdAt'>,
): Promise<OfflineAction> {
  const entry: OfflineAction = {
    ...action,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const actions = await readActions();
  actions.push(entry);
  await writeActions(actions);
  return entry;
}

/**
 * Return pending offline actions (useful for UI counts).
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  return readActions();
}

/**
 * Replay all queued actions against the API, removing each after success.
 * Actions that fail are kept in the queue for the next attempt.
 */
export async function syncPendingActions(): Promise<{
  synced: number;
  failed: number;
}> {
  const actions = await readActions();
  const remaining: OfflineAction[] = [];
  let synced = 0;

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create':
          await api.post(`/${action.resource}`, action.payload);
          break;
        case 'update':
          await api.put(`/${action.resource}`, action.payload);
          break;
        case 'delete':
          await api.delete(`/${action.resource}`);
          break;
      }
      synced++;
    } catch {
      remaining.push(action);
    }
  }

  await writeActions(remaining);
  return { synced, failed: remaining.length };
}

// ---------------------------------------------------------------------------
// Storage management
// ---------------------------------------------------------------------------

/**
 * Estimate storage consumed by offline data.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  const projects = await readProjects();
  const actions = await readActions();

  const projectSizes = projects.map((p) => ({
    name: p.name,
    size: estimateSize(p),
  }));

  const actionsSize = estimateSize(actions);
  const used = projectSizes.reduce((sum, p) => sum + p.size, 0) + actionsSize;

  // AsyncStorage does not expose a max -- use a sensible default (50 MB).
  const available = 50 * 1024 * 1024 - used;

  return { used, available: Math.max(available, 0), projects: projectSizes };
}

/**
 * Remove cached offline data. If a projectId is supplied only that project
 * is cleared; otherwise all offline data is removed.
 */
export async function clearOfflineData(projectId?: string): Promise<void> {
  if (projectId) {
    const projects = await readProjects();
    await writeProjects(projects.filter((p) => p.projectId !== projectId));
  } else {
    await AsyncStorage.multiRemove([STORAGE_KEY_PROJECTS, STORAGE_KEY_ACTIONS]);
  }
}
