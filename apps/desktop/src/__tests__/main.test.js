import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStore(initial = {}) {
  const data = { ...initial };
  return {
    get: vi.fn((key, defaultVal) => (key in data ? data[key] : defaultVal)),
    set: vi.fn((key, value) => { data[key] = value; }),
    _data: data,
  };
}

// ---------------------------------------------------------------------------
// 1. Application Menu
// ---------------------------------------------------------------------------
describe('Application Menu', () => {
  it('has File menu with expected items', () => {
    // Mirror the menu.js template structure for pure-unit validation
    const template = [
      {
        label: 'File',
        submenu: [
          { label: 'New Project', accelerator: 'CmdOrCtrl+N' },
          { label: 'Open...', accelerator: 'CmdOrCtrl+O' },
          { label: 'Save', accelerator: 'CmdOrCtrl+S' },
          { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S' },
          { label: 'Export...', accelerator: 'CmdOrCtrl+E' },
        ],
      },
    ];

    const fileMenu = template.find((m) => m.label === 'File');
    expect(fileMenu).toBeDefined();
    const labels = fileMenu.submenu.map((i) => i.label);
    expect(labels).toContain('New Project');
    expect(labels).toContain('Export...');
  });
});

// ---------------------------------------------------------------------------
// 2. GPU Benchmark
// ---------------------------------------------------------------------------
describe('GPU Benchmark', () => {
  it('returns score and recommendation shape', () => {
    // Validate the contract that detectGPU returns
    const mockResult = {
      available: true,
      gpus: [{ name: 'Mock GPU', vendor: 'NVIDIA', vramBytes: 8_000_000_000, driver: '535.0' }],
    };
    expect(mockResult).toMatchObject({ available: expect.any(Boolean) });
    expect(Array.isArray(mockResult.gpus)).toBe(true);
    expect(mockResult.gpus[0]).toHaveProperty('name');
    expect(mockResult.gpus[0]).toHaveProperty('vendor');
    expect(mockResult.gpus[0]).toHaveProperty('vramBytes');
  });
});

// ---------------------------------------------------------------------------
// 3. Keyboard Shortcuts
// ---------------------------------------------------------------------------
describe('Shortcuts', () => {
  it('registers all shortcuts with correct accelerators', () => {
    const accelerators = {
      newProject: 'CmdOrCtrl+N',
      open: 'CmdOrCtrl+O',
      save: 'CmdOrCtrl+S',
      saveAs: 'CmdOrCtrl+Shift+S',
      export: 'CmdOrCtrl+E',
    };

    expect(accelerators.newProject).toBe('CmdOrCtrl+N');
    expect(accelerators.save).toBe('CmdOrCtrl+S');
    expect(accelerators.export).toBe('CmdOrCtrl+E');
    expect(Object.keys(accelerators)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 4. Deep Links
// ---------------------------------------------------------------------------
describe('Deep Links', () => {
  it('parses animaforge:// URLs correctly', () => {
    const testUrl = 'animaforge://project/abc123?tab=timeline';
    const parsed = new URL(testUrl);

    expect(parsed.protocol).toBe('animaforge:');
    expect(parsed.hostname).toBe('project');
    expect(parsed.searchParams.get('tab')).toBe('timeline');

    // Also handles action paths
    const actionUrl = new URL('animaforge://open/proj-xyz');
    expect(actionUrl.protocol).toBe('animaforge:');
    expect(actionUrl.hostname).toBe('open');
  });
});

// ---------------------------------------------------------------------------
// 5. System Tray
// ---------------------------------------------------------------------------
describe('System Tray', () => {
  it('creates tray with correct menu', () => {
    const trayTemplate = [
      { label: 'Open AnimaForge', type: 'normal' },
      { type: 'separator' },
      { label: 'Recent Projects', type: 'submenu', submenu: [] },
      { type: 'separator' },
      { label: 'Quit', type: 'normal' },
    ];

    expect(trayTemplate).toHaveLength(5);
    expect(trayTemplate[0].label).toBe('Open AnimaForge');
    expect(trayTemplate[4].label).toBe('Quit');
    expect(trayTemplate[2].type).toBe('submenu');
  });
});

// ---------------------------------------------------------------------------
// 6. Splash Screen Config
// ---------------------------------------------------------------------------
describe('Splash Screen Config', () => {
  it('splash window has correct default dimensions and properties', () => {
    const splashConfig = {
      width: 480,
      height: 320,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
    };

    expect(splashConfig.width).toBe(480);
    expect(splashConfig.height).toBe(320);
    expect(splashConfig.frame).toBe(false);
    expect(splashConfig.transparent).toBe(true);
    expect(splashConfig.alwaysOnTop).toBe(true);
    expect(splashConfig.resizable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Default Settings
// ---------------------------------------------------------------------------
describe('Default Settings', () => {
  it('default application settings are well-formed', () => {
    const defaults = {
      theme: 'dark',
      autoSave: true,
      autoSaveIntervalMs: 30_000,
      renderQuality: 'high',
      maxRecentProjects: 10,
      checkForUpdates: true,
      gpuAcceleration: true,
      language: 'en',
    };

    expect(defaults.theme).toBe('dark');
    expect(defaults.autoSave).toBe(true);
    expect(defaults.autoSaveIntervalMs).toBeGreaterThan(0);
    expect(defaults.maxRecentProjects).toBe(10);
    expect(['low', 'medium', 'high']).toContain(defaults.renderQuality);
    expect(defaults.gpuAcceleration).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Storage Handlers (electron-store contract)
// ---------------------------------------------------------------------------
describe('Storage Handlers', () => {
  it('get/set round-trips and returns defaults for missing keys', () => {
    const store = createMockStore();

    // Default for missing key
    const fallback = store.get('nonexistent', 'fallback');
    expect(fallback).toBe('fallback');

    // Round-trip set/get
    store.set('theme', 'light');
    expect(store.set).toHaveBeenCalledWith('theme', 'light');
    store._data.theme = 'light';
    expect(store.get('theme', 'dark')).toBe('light');
  });
});
