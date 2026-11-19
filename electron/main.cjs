const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
// The desktop app opens the live website, so every GitHub update appears automatically (no rebuild).
const LIVE_URL = 'https://fatima-technology.github.io/alqadir-traders-sale-calculation/';
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 650,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  // Show the offline page if the live site cannot be reached.
  win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) win.loadFile(path.join(__dirname, '..', 'www', 'offline.html'));
  });
  // External links open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(LIVE_URL)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  // Always fetch the newest version on start.
  win.webContents.session.clearCache().finally(() => win.loadURL(LIVE_URL));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
