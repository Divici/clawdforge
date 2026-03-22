const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forgeAPI', {
  // Project directory selection
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  scanForPRD: (dirPath) => ipcRenderer.invoke('project:scan-prd', dirPath),

  // Claude process lifecycle
  spawnClaude: (config) => ipcRenderer.send('claude:spawn', config),
  onClaudeExit: (callback) => ipcRenderer.on('claude:exit', (_event, data) => callback(data)),

  // Terminal I/O
  onTerminalData: (callback) => ipcRenderer.on('terminal:data', (_event, data) => callback(data)),
  sendTerminalInput: (data) => ipcRenderer.send('terminal:input', data),
  sendTerminalResize: (cols, rows) => ipcRenderer.send('terminal:resize', { cols, rows }),

  // Forge events (parsed stage events)
  onForgeEvent: (callback) => ipcRenderer.on('forge:event', (_event, data) => callback(data)),

  // Forge response (dashboard -> Claude stdin)
  sendForgeResponse: (action, payload) => ipcRenderer.send('forge:respond', { action, payload }),

  // Load forge log for resume
  loadForgeLog: (projectDir) => ipcRenderer.invoke('forge:load-log', projectDir),
});
