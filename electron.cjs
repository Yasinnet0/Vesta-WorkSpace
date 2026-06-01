const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Explicitly set the app name so AppData folders are named Vesta instead of site
app.name = 'Vesta';
app.setAppUserModelId('com.vesta');

const isDev = process.env.NODE_ENV === 'development';
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
let windowState = { width: 1200, height: 800 };

try {
  if (fs.existsSync(stateFilePath)) {
    windowState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  }
} catch (e) {
  console.error('Failed to load window state:', e);
}

function startServer() {
  // Use local repository path for database files in development, and AppData in production installer builds
  const userDataPath = isDev ? __dirname : app.getPath('userData');

  // Start the express server
  serverProcess = fork(path.join(__dirname, 'server.js'), [], {
    env: { ...process.env, PORT: 5000, USER_DATA_PATH: userDataPath }
  });

  serverProcess.on('message', (msg) => {
    console.log('Server message:', msg);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: windowState.width || 1200,
    height: windowState.height || 800,
    x: windowState.x,
    y: windowState.y,
    minWidth: 950,
    minHeight: 650,
    resizable: true,
    frame: false, // Remove default title bar
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'public/logo.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#000000',
    show: false
  });

  mainWindow.setMenuBarVisibility(false); // Remove File, Edit, etc.

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Open target="_blank" links in external system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Intercept any in-app navigation to external links and open in external system default browser
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl.startsWith('http://localhost') && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // mainWindow.webContents.openDevTools(); // Disabled as requested
  });

  // Handle custom window controls
  ipcMain.on('window-action', (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    
    switch (action) {
      case 'minimize':
        win.minimize();
        break;
      case 'maximize':
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
        break;
      case 'close':
        win.close();
        break;
    }
  });

  let saveTimer = null;
  const saveState = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const bounds = mainWindow.getBounds();
        fs.writeFileSync(stateFilePath, JSON.stringify({
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y
        }));
      } catch (e) {
        console.error('Failed to save window state:', e);
      }
    }, 500); // 500ms debounce
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);

  if (isDev) {
    // Already opened above for both, but keeping dev check if needed
  }

  mainWindow.on('closed', () => {
    if (saveTimer) clearTimeout(saveTimer);
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) serverProcess.kill();
});
