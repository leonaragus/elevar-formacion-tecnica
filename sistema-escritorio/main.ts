import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    frame: false,
    backgroundColor: '#1a1a1a',
    minWidth: 800,
    minHeight: 600,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-admin-token', async () => {
  // Aquí se implementaría la lógica para obtener el token de admin
  return process.env.ADMIN_TOKEN || '';
});

ipcMain.handle('fetch-admin-api', async (event, endpoint: string, method: string = 'GET', body?: any) => {
  const token = process.env.ADMIN_TOKEN || '';
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`http://localhost:3000/api/admin/${endpoint}`, options);
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
});

ipcMain.handle('show-notification', (event, title: string, body: string) => {
  if (mainWindow) {
    mainWindow.webContents.send('show-notification', title, body);
  }
});

export default app;