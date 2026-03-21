import { Terminal } from '../../node_modules/@xterm/xterm/lib/xterm.mjs';
import { FitAddon } from '../../node_modules/@xterm/addon-fit/lib/addon-fit.mjs';

const chatContainer = document.getElementById('chat-container');
const terminalContainer = document.getElementById('terminal-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send');
const overlay = document.getElementById('launch-overlay');
const appContainer = document.getElementById('app');
const startBtn = document.getElementById('start-btn');
const browseBtn = document.getElementById('browse-btn');
const dirPathEl = document.getElementById('dir-path');
const promptInput = document.getElementById('prompt-input');
const prdStatus = document.getElementById('prd-status');
const prdNone = document.getElementById('prd-none');
const prdName = document.getElementById('prd-name');
const tabBtns = document.querySelectorAll('.tab-btn');

let term = null;
let fitAddon = null;
let selectedDir = null;
let detectedPRD = null;

// Strip ANSI codes for clean chat display
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

// Buffer to accumulate Claude output into chat messages
let outputBuffer = '';
let bufferTimeout = null;
const BUFFER_DELAY = 300; // ms to wait before flushing as a message

function flushOutputToChat() {
  const cleaned = stripAnsi(outputBuffer).trim();
  if (cleaned) {
    addChatMessage('claude', cleaned);
  }
  outputBuffer = '';
  bufferTimeout = null;
}

function bufferOutput(data) {
  outputBuffer += data;
  if (bufferTimeout) clearTimeout(bufferTimeout);
  bufferTimeout = setTimeout(flushOutputToChat, BUFFER_DELAY);
}

function addChatMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'chat') {
      chatContainer.style.display = 'flex';
      chatContainer.classList.add('active');
      terminalContainer.style.display = 'none';
      terminalContainer.classList.remove('active');
      chatInput.focus();
    } else {
      chatContainer.style.display = 'none';
      chatContainer.classList.remove('active');
      terminalContainer.style.display = 'block';
      terminalContainer.classList.add('active');
      if (fitAddon) fitAddon.fit();
      if (term) term.focus();
    }
  });
});

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
  term.open(terminalContainer);

  // Terminal tab is hidden initially, fit when shown
  // term.onData sends keystrokes when terminal tab is active
  term.onData((data) => {
    window.forgeAPI.sendTerminalInput(data);
  });

  // Receive PTY output — goes to both terminal and chat buffer
  window.forgeAPI.onTerminalData((data) => {
    term.write(data);
    bufferOutput(data);
  });

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    if (fitAddon && terminalContainer.classList.contains('active')) {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        window.forgeAPI.sendTerminalResize(dims.cols, dims.rows);
      }
    }
  });
  resizeObserver.observe(terminalContainer);
}

// Chat send
function sendChatMessage() {
  const text = chatInput.value;
  if (!text.trim()) return;

  addChatMessage('user', text);
  // Send to Claude via PTY stdin (add newline to submit)
  window.forgeAPI.sendTerminalInput(text + '\r');
  chatInput.value = '';
  chatInput.focus();
}

chatSendBtn.addEventListener('click', sendChatMessage);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

// Browse button — open native directory picker
browseBtn.addEventListener('click', async () => {
  const dirPath = await window.forgeAPI.selectDirectory();
  if (!dirPath) return;

  selectedDir = dirPath;
  dirPathEl.textContent = dirPath;
  dirPathEl.classList.add('selected');

  const result = await window.forgeAPI.scanForPRD(dirPath);

  prdStatus.classList.add('hidden');
  prdNone.classList.add('hidden');

  if (result.prdFiles && result.prdFiles.length > 0) {
    detectedPRD = result.prdFiles[0];
    prdName.textContent = `PRD found: ${detectedPRD}`;
    prdStatus.classList.remove('hidden');
  } else {
    detectedPRD = null;
    prdNone.classList.remove('hidden');
  }

  startBtn.disabled = false;
});

// Launch button
startBtn.addEventListener('click', () => {
  if (!selectedDir) return;

  const prompt = promptInput.value.trim();

  overlay.classList.add('hidden');
  appContainer.classList.remove('hidden');

  initTerminal();
  window.forgeAPI.spawnClaude({
    projectDir: selectedDir,
    prompt: prompt || null,
    prdFile: detectedPRD || null,
  });

  chatInput.focus();
});

// Handle Claude process exit
window.forgeAPI.onClaudeExit((data) => {
  if (bufferTimeout) {
    clearTimeout(bufferTimeout);
    flushOutputToChat();
  }

  const exitMsg = data.code === 0
    ? '[Process exited normally]'
    : `[Process exited with code ${data.code}]`;
  addChatMessage('claude', exitMsg);

  if (term) {
    const msg = data.code === 0
      ? '\r\n\x1b[32m[Process exited normally]\x1b[0m\r\n'
      : `\r\n\x1b[31m[Process exited with code ${data.code}]\x1b[0m\r\n`;
    term.write(msg);
  }
});
