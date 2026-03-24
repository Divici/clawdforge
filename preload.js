const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forgeAPI', {
  // Project directory selection
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  scanForPRD: (dirPath) => ipcRenderer.invoke('project:scan-prd', dirPath),

  // Claude process lifecycle
  spawnClaude: (config) => ipcRenderer.send('claude:spawn', config),
  onClaudeExit: (callback) => ipcRenderer.on('claude:exit', (_event, data) => callback(data)),

  // Disk-state events (from ForgeStateWatcher)
  onStateUpdate: (callback) => ipcRenderer.on('forge:state-update', (_event, data) => callback(data)),
  onPresearchUpdate: (callback) => ipcRenderer.on('forge:presearch-update', (_event, data) => callback(data)),
  onBuildUpdate: (callback) => ipcRenderer.on('forge:build-update', (_event, data) => callback(data)),
  onModeChange: (callback) => ipcRenderer.on('forge:mode-change', (_event, data) => callback(data)),
  onWaitingForInput: (callback) => ipcRenderer.on('forge:waiting-for-input', (_event, data) => callback(data)),

  // Raw Claude output (assistant text for build log)
  onRawOutput: (callback) => ipcRenderer.on('forge:raw-output', (_event, data) => callback(data)),

  // Tool activity (stream-json tool_use events)
  onToolUse: (callback) => ipcRenderer.on('claude:tool-use', (_event, data) => callback(data)),
  onToolResult: (callback) => ipcRenderer.on('claude:tool-result', (_event, data) => callback(data)),

  // Session and cost tracking
  onSession: (callback) => ipcRenderer.on('claude:session', (_event, data) => callback(data)),
  onCost: (callback) => ipcRenderer.on('claude:cost', (_event, data) => callback(data)),
  onTurnEnd: (callback) => ipcRenderer.on('claude:turn-end', (_event, data) => callback(data)),

  // User responses (writes .forge/user-input.json via main process)
  sendForgeResponse: (action, payload) => ipcRenderer.send('forge:respond', { action, payload }),

  // Load forge state for resume detection
  loadForgeLog: (projectDir) => ipcRenderer.invoke('forge:load-log', projectDir),
});

// Pipe main process logs to renderer DevTools console
const { ipcRenderer: ipc } = require('electron');
ipc.on('main-log', (_event, { level, msg }) => {
  const prefix = '[main]';
  if (level === 'error') console.error(prefix, msg);
  else if (level === 'warn') console.warn(prefix, msg);
  else console.log(prefix, msg);
});
