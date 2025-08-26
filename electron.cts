import { app, BrowserWindow } from 'electron';
import path from 'path';
import { Server } from 'http';

let servers: Server[];

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Corrected: Load index.html from the correct public folder
  mainWindow.loadFile('jarvis/public/index.html');
}

app.whenReady().then(async () => {
  const { startServers } = await import('./src/server.js');
  servers = startServers();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    servers.forEach(server => server.close());
    app.quit();
  }
});