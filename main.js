const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
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
    backgroundColor: '#1e1e2e',
    title: 'Matrix Forge Command Deck',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
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

// IPC: spawn Claude
ipcMain.on('claude:spawn', (_event, prompt) => {
  if (runner) {
    runner.kill();
  }
  runner = new ClaudeRunner(bus);
  runner.spawn(prompt, (data) => {
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
