const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { ForgeBus } = require('./src/bridge/event-bus');
const { StageParser } = require('./src/bridge/stage-parser');
const { ClaudeRunner } = require('./src/bridge/claude-runner');

let mainWindow;
const bus = new ForgeBus();
const parser = new StageParser(bus);
let runner = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 900,
    minHeight: 500,
    backgroundColor: '#1A1A2E',
    title: 'Claw\'d Forge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev: load Vite dev server; Prod: load built files
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // Vite not running — try built output or raw source
      const builtPath = path.join(__dirname, 'dist-renderer', 'index.html');
      if (fs.existsSync(builtPath)) {
        mainWindow.loadFile(builtPath);
      } else {
        mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist-renderer', 'index.html'));
  }

  mainWindow.setMenuBarVisibility(false);
}

// Forward parsed events to renderer
const FORGE_EVENTS = [
  'mode:change',
  'stage:change',
  'agent:spawn',
  'agent:done',
  'decision:lock',
  'artifact:create',
  'warning',
];

for (const event of FORGE_EVENTS) {
  bus.on(event, (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('forge:event', { type: event, ...payload });
    }
  });
}

// Handle claude:exit from bus
bus.on('claude:exit', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('claude:exit', data);
  }
});

// IPC: open native directory picker
ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Directory',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// IPC: scan directory for PRD files
ipcMain.handle('project:scan-prd', async (_event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    // Look for common PRD file patterns
    const prdPatterns = [
      /prd/i,
      /product.?requirements/i,
      /brief/i,
      /spec/i,
      /requirements/i,
    ];
    const prdFiles = files.filter((f) => {
      if (!f.endsWith('.md') && !f.endsWith('.txt')) return false;
      return prdPatterns.some((p) => p.test(f));
    });
    return { prdFiles, hasWorkflowState: files.includes('WORKFLOW_STATE.md') };
  } catch (e) {
    return { prdFiles: [], hasWorkflowState: false, error: e.message };
  }
});

// IPC: spawn Claude
ipcMain.on('claude:spawn', (_event, config) => {
  const { projectDir, prompt, prdFile } = config;

  if (runner) {
    runner.kill();
  }
  runner = new ClaudeRunner(bus);
  runner.spawn({ projectDir, prompt, prdFile }, (data) => {
    // Feed to stage parser
    parser.feed(data);
    // Forward raw data to terminal
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', data);
    }
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('claude:spawn', { pid: runner.ptyProcess?.pid });
  }
});

// IPC: terminal input from user
ipcMain.on('terminal:input', (_event, data) => {
  if (runner) {
    runner.write(data);
  }
});

// IPC: terminal resize
ipcMain.on('terminal:resize', (_event, { cols, rows }) => {
  if (runner) {
    runner.resize(cols, rows);
  }
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (runner) runner.kill();
  app.quit();
});
