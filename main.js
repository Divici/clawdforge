const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { ForgeBus, FORGE_STATE_EVENTS, CLAUDE_EVENTS } = require('./src/bridge/event-bus');
const { ClaudeRunner } = require('./src/bridge/claude-runner');

let mainWindow;
const bus = new ForgeBus();
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

  // Load the renderer — prefer built output, fall back to Vite dev server
  const builtPath = path.join(__dirname, 'dist-renderer', 'index.html');
  if (fs.existsSync(builtPath)) {
    mainWindow.loadFile(builtPath);
  } else if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    });
  } else {
    console.error('dist-renderer/index.html not found in packaged app');
  }

  mainWindow.setMenuBarVisibility(false);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Forward disk-state events to renderer
for (const event of FORGE_STATE_EVENTS) {
  bus.on(event, (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, payload);
    }
  });
}

// Forward claude stream-json events to renderer
for (const event of CLAUDE_EVENTS) {
  bus.on(event, (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, payload);
    }
  });
}

// Forward claude:exit from bus
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
  const { projectDir, prompt, runMode } = config;

  try {
    if (runner) {
      runner.kill();
    }
    runner = new ClaudeRunner(bus);

    // Forward raw assistant text to renderer for build log
    const onText = (text) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('forge:raw-output', text);
      }
    };

    runner.spawn({ projectDir, prompt: prompt || 'Run the /workflow skill', onText, runMode: runMode || 'autonomous' });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('claude:spawn', { sessionId: runner.sessionId });
    }
  } catch (err) {
    console.error('[forge-main] Failed to spawn Claude:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('claude:error', { message: `Spawn failed: ${err.message}` });
      mainWindow.webContents.send('claude:exit', { code: 1 });
    }
  }
});

// IPC: forge respond (dashboard interaction -> write user input to disk)
ipcMain.on('forge:respond', (_event, { action, payload }) => {
  if (!runner) return;

  if (payload && payload.requestId) {
    runner.writeUserInput(payload.requestId, payload.answer || payload.name || payload.text || '');
    return;
  }

  // Fallback for non-requestId actions (pause, resume, skip-mock)
  // These don't need disk-state — they're control signals
  console.log('forge:respond without requestId:', action, payload);
});

// IPC: load forge state for resume
ipcMain.handle('forge:load-log', async (_event, projectDir) => {
  const statePath = path.join(projectDir, '.forge', 'state.json');
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (runner) runner.kill();
  app.quit();
});
