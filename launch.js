// Launch script that ensures ELECTRON_RUN_AS_NODE is unset.
// VS Code / Claude Code sets this env var, which prevents Electron from
// initializing its browser process. We must remove it before spawning.
const { spawn } = require('child_process');
const electron = require('electron');

delete process.env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: process.env,
  windowsHide: false,
});

child.on('close', (code) => process.exit(code));
