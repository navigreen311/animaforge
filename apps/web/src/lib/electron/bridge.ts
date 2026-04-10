interface ElectronAPI {
  showOpenDialog: (options: any) => Promise<any>;
  showSaveDialog: (options: any) => Promise<any>;
  showNotification: (params: { title: string; body: string }) => Promise<void>;
  getVersion: () => Promise<string>;
  quitAndInstall: () => Promise<void>;
  onUpdateAvailable: (callback: () => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
}

export async function getElectronVersion(): Promise<string | null> {
  if (!isElectron()) return null;
  return await window.electronAPI!.getVersion();
}

export async function showNativeNotification(title: string, body: string): Promise<void> {
  if (isElectron()) {
    await window.electronAPI!.showNotification({ title, body });
  } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export async function pickFile(options?: any): Promise<string[]> {
  if (!isElectron()) return [];
  const result = await window.electronAPI!.showOpenDialog(options || { properties: ['openFile'] });
  return result.filePaths || [];
}

export function onUpdateAvailable(cb: () => void): void {
  if (isElectron()) window.electronAPI!.onUpdateAvailable(cb);
}

export function onUpdateDownloaded(cb: () => void): void {
  if (isElectron()) window.electronAPI!.onUpdateDownloaded(cb);
}

export async function applyUpdate(): Promise<void> {
  if (isElectron()) await window.electronAPI!.quitAndInstall();
}
