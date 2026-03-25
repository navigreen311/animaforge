const { app } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Return the directory used to cache AI model weights locally.
 */
function getModelCacheDir() {
  return path.join(app.getPath('userData'), 'model-cache');
}

/**
 * Detect available GPU information using platform-specific tooling.
 * Returns a structured object with vendor, name, and vram when available.
 */
async function detectGPU() {
  return new Promise((resolve) => {
    const platform = process.platform;

    if (platform === 'win32') {
      // Use WMIC on Windows to query GPU adapter info
      execFile(
        'wmic',
        ['path', 'win32_VideoController', 'get', 'Name,AdapterRAM,DriverVersion', '/format:csv'],
        { timeout: 10000 },
        (err, stdout) => {
          if (err) {
            resolve({ available: false, error: err.message });
            return;
          }

          const lines = stdout.trim().split('\n').filter((l) => l.trim());
          const gpus = [];

          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length >= 4) {
              const adapterRAM = parseInt(parts[1], 10);
              const name = parts[2]?.trim() || 'Unknown';
              const driver = parts[3]?.trim() || '';
              const vendor = name.toLowerCase().includes('nvidia')
                ? 'NVIDIA'
                : name.toLowerCase().includes('amd') || name.toLowerCase().includes('radeon')
                  ? 'AMD'
                  : name.toLowerCase().includes('intel')
                    ? 'Intel'
                    : 'Unknown';

              gpus.push({
                name,
                vendor,
                vramBytes: isNaN(adapterRAM) ? null : adapterRAM,
                driver,
              });
            }
          }

          resolve({ available: gpus.length > 0, gpus });
        },
      );
    } else if (platform === 'linux') {
      execFile('lspci', ['-v'], { timeout: 10000 }, (err, stdout) => {
        if (err) {
          resolve({ available: false, error: err.message });
          return;
        }

        const vgaBlocks = stdout.split('\n\n').filter((b) => /VGA|3D|Display/i.test(b));
        const gpus = vgaBlocks.map((block) => {
          const firstLine = block.split('\n')[0] || '';
          const vendor = firstLine.toLowerCase().includes('nvidia')
            ? 'NVIDIA'
            : firstLine.toLowerCase().includes('amd')
              ? 'AMD'
              : firstLine.toLowerCase().includes('intel')
                ? 'Intel'
                : 'Unknown';
          return { name: firstLine.replace(/^.*:\s*/, '').trim(), vendor, vramBytes: null, driver: '' };
        });

        resolve({ available: gpus.length > 0, gpus });
      });
    } else if (platform === 'darwin') {
      execFile('system_profiler', ['SPDisplaysDataType'], { timeout: 10000 }, (err, stdout) => {
        if (err) {
          resolve({ available: false, error: err.message });
          return;
        }

        const chipMatch = stdout.match(/Chipset Model:\s*(.+)/i);
        const vramMatch = stdout.match(/VRAM.*:\s*(\d+)/i);

        resolve({
          available: !!chipMatch,
          gpus: chipMatch
            ? [
                {
                  name: chipMatch[1].trim(),
                  vendor: chipMatch[1].includes('Apple') ? 'Apple' : 'Unknown',
                  vramBytes: vramMatch ? parseInt(vramMatch[1], 10) * 1024 * 1024 : null,
                  driver: '',
                },
              ]
            : [],
        });
      });
    } else {
      resolve({ available: false, error: `Unsupported platform: ${platform}` });
    }
  });
}

/**
 * Register all rendering / local-AI IPC handlers.
 */
function registerRenderHandlers(ipcMain) {
  // Stub: trigger local GPU rendering
  ipcMain.handle('start-local-render', async (_event, jobParams) => {
    // TODO: integrate with actual render engine (e.g., a Python subprocess or WASM runtime)
    return {
      status: 'queued',
      jobId: `local-${Date.now()}`,
      message: 'Local rendering is not yet implemented. This is a placeholder.',
      params: jobParams,
    };
  });

  // Detect available GPU hardware
  ipcMain.handle('get-gpu-info', async () => {
    return detectGPU();
  });

  // Check whether model weights are already cached locally
  ipcMain.handle('check-local-model-cache', async (_event, modelId) => {
    const modelDir = path.join(getModelCacheDir(), modelId);
    try {
      const stat = await fs.stat(modelDir);
      if (!stat.isDirectory()) return { cached: false };

      const files = await fs.readdir(modelDir);
      return { cached: files.length > 0, path: modelDir, files };
    } catch {
      return { cached: false };
    }
  });

  // Download model weights to local cache (stub — emits progress events)
  ipcMain.handle('download-model', async (event, modelId) => {
    const modelDir = path.join(getModelCacheDir(), modelId);
    await fs.mkdir(modelDir, { recursive: true });

    // TODO: replace with real model registry URL lookup
    // For now, return a placeholder indicating where the model would be stored
    return {
      status: 'not-implemented',
      message: `Model download for "${modelId}" is stubbed. Cache directory created at: ${modelDir}`,
      path: modelDir,
    };
  });
}

module.exports = { registerRenderHandlers };
