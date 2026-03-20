const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forgeAPI', {
  // Claude process lifecycle
  spawnClaude: (prompt) => ipcRenderer.send('claude:spawn', prompt),
  onClaudeExit: (callback) => ipcRenderer.on('claude:exit', (_event, data) => callback(data)),

  // Terminal I/O
  onTerminalData: (callback) => ipcRenderer.on('terminal:data', (_event, data) => callback(data)),
  sendTerminalInput: (data) => ipcRenderer.send('terminal:input', data),
  sendTerminalResize: (cols, rows) => ipcRenderer.send('terminal:resize', { cols, rows }),

  // Forge events (parsed stage events)
  onForgeEvent: (callback) => ipcRenderer.on('forge:event', (_event, data) => callback(data)),
});
