const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');
const log = require('electron-log') ?? console;

/**
 * Configure and wire the electron-updater auto-updater to the main window.
 * Update events are forwarded to the renderer via IPC so the UI can react.
 */
function setupAutoUpdater(mainWindow) {
  // Use default GitHub releases provider (reads from package.json / electron-builder config)
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // ── Logging ──────────────────────────────────────────────────────────────
  autoUpdater.logger = log;

  // ── Events → renderer ────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer(mainWindow, 'update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer(mainWindow, 'update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    sendToRenderer(mainWindow, 'update-not-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer(mainWindow, 'update-download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer(mainWindow, 'update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer(mainWindow, 'update-error', err?.message ?? String(err));
  });

  // ── IPC handlers (renderer → main) ──────────────────────────────────────
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo ?? null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Perform an initial check shortly after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 10_000);
}

/**
 * Safely send an IPC message to the renderer — no-ops if the window is gone.
 */
function sendToRenderer(win, channel, data) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

module.exports = { setupAutoUpdater };
