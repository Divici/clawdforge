const pty = require('node-pty');
const path = require('path');

class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this.ptyProcess = null;
  }

  spawn(config, onData) {
    const { projectDir, prompt, prdFile } = config;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: projectDir,
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    const workflowPrompt = '/workflow';

    // Watch output for Claude's ready signal, then send /workflow
    let claudeSent = false;
    let workflowSent = false;
    let buffer = '';

    this.ptyProcess.onData((data) => {
      if (onData) onData(data);

      // Watch for signals to auto-send commands
      if (!claudeSent || !workflowSent) {
        buffer += data;

        // Send claude command after shell prompt appears (e.g., > or $)
        if (!claudeSent && buffer.length > 50) {
          claudeSent = true;
          setTimeout(() => {
            this.ptyProcess.write(`claude --dangerously-skip-permissions\r`);
          }, 300);
        }

        // Wait for Claude's ready indicator (the > prompt or "Human:" or similar)
        // Claude CLI shows a prompt character when ready for input
        if (claudeSent && !workflowSent) {
          // Look for Claude's input prompt — typically ends with a special character
          // or we see the welcome banner has finished
          if (buffer.includes('\\') || buffer.includes('>') || buffer.includes('Human:') || buffer.includes('claude-code') || buffer.includes('Tips')) {
            // Check if enough time has passed since claude was sent
            const timeSinceClaude = buffer.length;
            if (timeSinceClaude > 500) {
              workflowSent = true;
              setTimeout(() => {
                this.ptyProcess.write(`${workflowPrompt}\r`);
              }, 1000);
            }
          }
        }
      }
    });

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.bus.emit('claude:exit', { code: exitCode, signal });
    });

    return this.ptyProcess;
  }

  write(data) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols, rows) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}

module.exports = { ClaudeRunner };
