const { contextBridge, ipcRenderer } = require('electron');

/**
 * AnimaForge Desktop — Preload Script
 *
 * Exposes a safe, narrowly-scoped API to the renderer process
 * via contextBridge. Only whitelisted IPC channels are accessible.
 */

const ALLOWED_SEND_CHANNELS = ['deep-link'];
const ALLOWED_INVOKE_CHANNELS = [
  'open-file-dialog',
  'select-directory',
  'read-local-file',
  'write-local-file',
  'get-app-path',
  'get-version',
  'show-notification',
  'get-local-model-path',
  'start-local-render',
  'get-gpu-info',
  'check-local-model-cache',
  'download-model',
  'check-for-updates',
  'download-update',
  'install-update',
];

contextBridge.exposeInMainWorld('animaforge', {
  // File operations
  openFileDialog: (filters) => ipcRenderer.invoke('open-file-dialog', filters),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readLocalFile: (filePath) => ipcRenderer.invoke('read-local-file', filePath),
  writeLocalFile: (filePath, data) =>
    ipcRenderer.invoke('write-local-file', filePath, data),

  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Notifications
  showNotification: (title, body) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  // Local AI / rendering
  getLocalModelPath: (modelId) =>
    ipcRenderer.invoke('get-local-model-path', modelId),
  startLocalRender: (jobParams) =>
    ipcRenderer.invoke('start-local-render', jobParams),
  getGPUInfo: () => ipcRenderer.invoke('get-gpu-info'),
  checkLocalModelCache: (modelId) =>
    ipcRenderer.invoke('check-local-model-cache', modelId),
  downloadModel: (modelId) => ipcRenderer.invoke('download-model', modelId),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Event listeners (renderer ← main)
  onDeepLink: (callback) => {
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('deep-link', handler);
    return () => ipcRenderer.removeListener('deep-link', handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('model-download-progress', handler);
    return () => ipcRenderer.removeListener('model-download-progress', handler);
  },
  onUpdateAvailable: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
});
