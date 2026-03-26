const { shell } = require('electron');
const fs = require('fs/promises');
const path = require('path');

/**
 * Default key for the electron-store recents list.
 */
const RECENTS_KEY = 'recentProjects';
const MAX_RECENTS = 10;

/**
 * Register all project-related IPC handlers.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Electron.BrowserWindow} mainWindow
 * @param {import('electron-store')} store - electron-store instance for persisting settings
 */
function registerProjectHandlers(ipcMain, mainWindow, store) {
  /**
   * openProject — navigate the web view to the given project and
   * activate project-specific shortcuts.
   */
  ipcMain.handle('open-project', async (_event, projectId) => {
    if (!projectId || typeof projectId !== 'string') {
      return { success: false, error: 'projectId is required' };
    }

    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('navigate-project', projectId);
      }
      return { success: true, projectId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * exportProject — trigger an export via the API and save the result
   * to a local directory.
   */
  ipcMain.handle('export-project', async (_event, projectId, format, outputDir) => {
    if (!projectId || !format || !outputDir) {
      return { success: false, error: 'projectId, format, and outputDir are required' };
    }

    try {
      const resolvedDir = path.resolve(outputDir);
      await fs.mkdir(resolvedDir, { recursive: true });

      // Notify the renderer to kick off the export via the web API
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-export', { projectId, format, outputDir: resolvedDir });
      }

      return { success: true, projectId, format, outputDir: resolvedDir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * importProject — read a local project file and return its contents
   * for upload to the API.
   */
  ipcMain.handle('import-project', async (_event, filePath) => {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'filePath is required' };
    }

    try {
      const absolutePath = path.resolve(filePath);
      const data = await fs.readFile(absolutePath);
      const base64 = data.toString('base64');
      const ext = path.extname(absolutePath).toLowerCase();
      const fileName = path.basename(absolutePath);

      return {
        success: true,
        fileName,
        extension: ext,
        data: base64,
        path: absolutePath,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * getRecentProjects — return the list of recently opened projects
   * from the electron-store.
   */
  ipcMain.handle('get-recent-projects', async () => {
    try {
      const recents = store.get(RECENTS_KEY, []);
      return { success: true, projects: recents };
    } catch (err) {
      return { success: false, error: err.message, projects: [] };
    }
  });

  /**
   * addToRecents — add a project to the recents list (max 10 entries).
   * If the project already exists it is moved to the front.
   */
  ipcMain.handle('add-to-recents', async (_event, projectId, title) => {
    if (!projectId) {
      return { success: false, error: 'projectId is required' };
    }

    try {
      const recents = store.get(RECENTS_KEY, []);
      const filtered = recents.filter((r) => r.projectId !== projectId);
      const entry = { projectId, title: title || 'Untitled', openedAt: new Date().toISOString() };
      const updated = [entry, ...filtered].slice(0, MAX_RECENTS);
      store.set(RECENTS_KEY, updated);
      return { success: true, recents: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * openInBrowser — open a URL in the user's default browser.
   * Useful for sharing links, documentation, etc.
   */
  ipcMain.handle('open-in-browser', async (_event, url) => {
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'url is required' };
    }

    try {
      await shell.openExternal(url);
      return { success: true, url };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * showInFileExplorer — reveal a file or directory in Finder / Explorer.
   */
  ipcMain.handle('show-in-file-explorer', async (_event, targetPath) => {
    if (!targetPath || typeof targetPath !== 'string') {
      return { success: false, error: 'path is required' };
    }

    try {
      shell.showItemInFolder(path.resolve(targetPath));
      return { success: true, path: path.resolve(targetPath) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerProjectHandlers, RECENTS_KEY, MAX_RECENTS };
