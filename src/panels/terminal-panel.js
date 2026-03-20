import { Terminal } from '../../node_modules/@xterm/xterm/lib/xterm.mjs';
import { FitAddon } from '../../node_modules/@xterm/addon-fit/lib/addon-fit.mjs';

const container = document.getElementById('terminal-container');
const overlay = document.getElementById('launch-overlay');
const appContainer = document.getElementById('app');
const startBtn = document.getElementById('start-btn');
const promptInput = document.getElementById('prompt-input');

let term = null;
let fitAddon = null;

function initTerminal() {
  term = new Terminal({
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
    fontSize: 13,
    scrollback: 5000,
    cursorBlink: true,
    cursorStyle: 'block',
    theme: {
      background: '#1e1e2e',
      foreground: '#d4d4d4',
      cursor: '#4ade80',
      cursorAccent: '#1e1e2e',
      selectionBackground: '#2d5a3d',
      black: '#1e1e2e',
      green: '#4ade80',
      brightGreen: '#5b9a5b',
      red: '#e85555',
      yellow: '#e8956a',
      white: '#d4d4d4',
    },
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(container);
  fitAddon.fit();

  // Send user keystrokes to main process → PTY
  term.onData((data) => {
    window.forgeAPI.sendTerminalInput(data);
  });

  // Receive PTY output from main process
  window.forgeAPI.onTerminalData((data) => {
    term.write(data);
  });

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    if (fitAddon) {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        window.forgeAPI.sendTerminalResize(dims.cols, dims.rows);
      }
    }
  });
  resizeObserver.observe(container);

  // Focus terminal
  term.focus();
}

// Launch button handler
startBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    return;
  }

  // Hide overlay, show app
  overlay.classList.add('hidden');
  appContainer.classList.remove('hidden');

  // Initialize terminal and spawn Claude
  initTerminal();
  window.forgeAPI.spawnClaude(prompt);
});

// Allow Enter in textarea to submit (Shift+Enter for newline)
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    startBtn.click();
  }
});

// Handle Claude process exit
window.forgeAPI.onClaudeExit((data) => {
  if (term) {
    const msg = data.code === 0
      ? '\r\n\x1b[32m[Process exited normally]\x1b[0m\r\n'
      : `\r\n\x1b[31m[Process exited with code ${data.code}]\x1b[0m\r\n`;
    term.write(msg);
  }
});
