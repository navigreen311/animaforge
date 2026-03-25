const { dialog, app } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const FILE_FILTERS = {
  images: { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'] },
  video: { name: 'Video', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv'] },
  models3d: { name: '3D Models', extensions: ['glb', 'gltf', 'fbx', 'obj', 'usd', 'usdc', 'usdz'] },
  bvh: { name: 'Motion Capture', extensions: ['bvh'] },
  all: { name: 'All AnimaForge Files', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'mp4', 'mov', 'avi', 'webm', 'mkv', 'glb', 'gltf', 'fbx', 'obj', 'usd', 'usdc', 'usdz', 'bvh'] },
};

/**
 * Return the directory used to cache AI model weights locally.
 */
function getModelCacheDir() {
  return path.join(app.getPath('userData'), 'model-cache');
}

/**
 * Register all file-related IPC handlers.
 */
function registerFileHandlers(ipcMain) {
  // Open native file picker with optional filter keys
  ipcMain.handle('open-file-dialog', async (_event, filterKeys) => {
    const filters = [];
    if (Array.isArray(filterKeys) && filterKeys.length > 0) {
      for (const key of filterKeys) {
        if (FILE_FILTERS[key]) filters.push(FILE_FILTERS[key]);
      }
    } else {
      filters.push(FILE_FILTERS.all);
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters,
    });

    return canceled ? [] : filePaths;
  });

  // Directory picker for export destination
  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });

    return canceled ? null : filePaths[0];
  });

  // Read a file from the local filesystem (returns Buffer as base64)
  ipcMain.handle('read-local-file', async (_event, filePath) => {
    try {
      const absolutePath = path.resolve(filePath);
      const data = await fs.readFile(absolutePath);
      return { success: true, data: data.toString('base64'), path: absolutePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Write data to a local file (expects base64 string or utf-8 text)
  ipcMain.handle('write-local-file', async (_event, filePath, data) => {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      const buffer = Buffer.from(data, 'base64');
      await fs.writeFile(absolutePath, buffer);

      return { success: true, path: absolutePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get local path for a cached AI model
  ipcMain.handle('get-local-model-path', async (_event, modelId) => {
    const modelDir = path.join(getModelCacheDir(), modelId);
    try {
      await fs.access(modelDir);
      return { exists: true, path: modelDir };
    } catch {
      return { exists: false, path: modelDir };
    }
  });
}

module.exports = { registerFileHandlers };
