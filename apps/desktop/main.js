const { app, BrowserWindow, shell, ipcMain, Menu, Notification } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  const url = isDev
    ? 'http://localhost:3000'
    : 'https://app.animaforge.com';

  mainWindow.loadURL(url);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Auto-update check
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers — exposed to renderer via preload
ipcMain.handle('show-open-dialog', async (_, options) => {
  const { dialog } = require('electron');
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (_, options) => {
  const { dialog } = require('electron');
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-notification', (_, { title, body }) => {
  new Notification({ title, body }).show();
});

ipcMain.handle('get-version', () => app.getVersion());

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});
