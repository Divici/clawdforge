const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forgeAPI', {
  // Project directory selection
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  scanForPRD: (dirPath) => ipcRenderer.invoke('project:scan-prd', dirPath),

  // Claude process lifecycle
  spawnClaude: (config) => ipcRenderer.send('claude:spawn', config),
  onClaudeExit: (callback) => ipcRenderer.on('claude:exit', (_event, data) => callback(data)),

  // Forge events — legacy marker-based (kept for Phase 1 parallel)
  onForgeEvent: (callback) => ipcRenderer.on('forge:event', (_event, data) => callback(data)),

  // Forge events — disk-state (Path B architecture)
  onStateUpdate: (callback) => ipcRenderer.on('forge:state-update', (_event, data) => callback(data)),
  onPresearchUpdate: (callback) => ipcRenderer.on('forge:presearch-update', (_event, data) => callback(data)),
  onBuildUpdate: (callback) => ipcRenderer.on('forge:build-update', (_event, data) => callback(data)),
  onModeChange: (callback) => ipcRenderer.on('forge:mode-change', (_event, data) => callback(data)),
  onWaitingForInput: (callback) => ipcRenderer.on('forge:waiting-for-input', (_event, data) => callback(data)),

  // Raw Claude output (clean text from assistant, for build log)
  onRawOutput: (callback) => ipcRenderer.on('forge:raw-output', (_event, data) => callback(data)),

  // Tool activity (stream-json tool_use events)
  onToolUse: (callback) => ipcRenderer.on('claude:tool-use', (_event, data) => callback(data)),
  onToolResult: (callback) => ipcRenderer.on('claude:tool-result', (_event, data) => callback(data)),

  // Session and cost tracking
  onSession: (callback) => ipcRenderer.on('claude:session', (_event, data) => callback(data)),
  onCost: (callback) => ipcRenderer.on('claude:cost', (_event, data) => callback(data)),
  onTurnEnd: (callback) => ipcRenderer.on('claude:turn-end', (_event, data) => callback(data)),

  // Forge response (dashboard -> resume Claude with answer)
  sendForgeResponse: (action, payload) => ipcRenderer.send('forge:respond', { action, payload }),

  // Load forge log for resume
  loadForgeLog: (projectDir) => ipcRenderer.invoke('forge:load-log', projectDir),
});
