const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { ForgeBus, FORGE_EVENTS_V2, FORGE_STATE_EVENTS, CLAUDE_EVENTS } = require('./src/bridge/event-bus');
const { StageParser } = require('./src/bridge/stage-parser');
const { ClaudeRunner } = require('./src/bridge/claude-runner');
const { ForgeLog } = require('./src/bridge/forge-log');
const { translateAction } = require('./src/bridge/stdin-translator');

let mainWindow;
const bus = new ForgeBus();
const parser = new StageParser(bus);
let runner = null;
let forgeLog = null;

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
    // No built output — try Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    });
  } else {
    // Packaged but no dist-renderer — should not happen
    console.error('dist-renderer/index.html not found in packaged app');
  }

  mainWindow.setMenuBarVisibility(false);

  // Open DevTools in dev mode for debugging
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Forward v1 + v2 forge events to renderer
const ALL_FORGE_EVENTS = [
  'mode:change', 'stage:change', 'agent:spawn', 'agent:done',
  'decision:lock', 'artifact:create', 'warning',
  ...FORGE_EVENTS_V2,
];

for (const event of ALL_FORGE_EVENTS) {
  bus.on(event, (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('forge:event', { type: event, ...payload });
    }
  });
}

// Forward disk-state events to renderer (Path B architecture)
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
  const { projectDir, prompt, prdFile, runMode } = config;

  if (runner) {
    runner.kill();
  }
  runner = new ClaudeRunner(bus);

  // Connect assistant text to stage parser for [FORGE:] marker extraction (legacy, kept for Phase 1 parallel)
  // and forward as raw output to the renderer for the build log
  const onText = (text) => {
    parser.feedText(text);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('forge:raw-output', text);
    }
  };

  runner.spawn({ projectDir, prompt: prompt || 'Run the /workflow skill', onText, runMode: runMode || 'autonomous' });

  // Initialize forge log
  forgeLog = new ForgeLog(projectDir);
  forgeLog.load();
  forgeLog._data.projectName = projectDir.split(/[/\\]/).pop();
  forgeLog._data.startTime = new Date().toISOString();
  forgeLog.save();

  // Wire forge events to log persistence
  bus.on('forge:decision', (payload) => {
    if (forgeLog) forgeLog.addPresearchDecision(payload);
  });
  bus.on('forge:task', (payload) => {
    if (forgeLog) forgeLog.addBuildCard({ type: 'task', ...payload, timestamp: new Date().toISOString() });
  });
  bus.on('forge:phase', (payload) => {
    if (forgeLog) forgeLog.updatePhase(payload.phase, payload.current, payload.total, payload.phaseNames);
  });
  bus.on('forge:mode', (payload) => {
    if (forgeLog) forgeLog.updateMode(payload.mode);
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('claude:spawn', { sessionId: runner.sessionId });
  }
});

// IPC: forge respond (dashboard card interaction -> write user input or resume Claude)
ipcMain.on('forge:respond', (_event, { action, payload }) => {
  if (!runner) return;

  // Path B: write user input to disk for interactive mode
  if (payload && payload.requestId) {
    runner.writeUserInput(payload.requestId, payload.answer || payload.name || payload.text || '');
    return;
  }

  // Legacy path: translate action to text and resume via --resume
  const text = translateAction(action, payload);
  runner.respond(text);
});

// IPC: load forge log for resume
ipcMain.handle('forge:load-log', async (_event, projectDir) => {
  const log = new ForgeLog(projectDir);
  return log.load();
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (runner) runner.kill();
  app.quit();
});
