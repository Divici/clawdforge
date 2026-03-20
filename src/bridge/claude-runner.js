const pty = require('node-pty');
const path = require('path');

class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this.ptyProcess = null;
  }

  spawn(prompt, onData) {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    this.ptyProcess.onData((data) => {
      if (onData) onData(data);
    });

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.bus.emit('claude:exit', { code: exitCode, signal });
    });

    // Send the claude command after a brief delay for shell init
    setTimeout(() => {
      const claudeCmd = `claude --dangerously-skip-permissions\r`;
      this.ptyProcess.write(claudeCmd);

      // After Claude starts, send the workflow prompt
      setTimeout(() => {
        const escapedPrompt = prompt.replace(/\r?\n/g, ' ');
        this.ptyProcess.write(`/workflow ${escapedPrompt}\r`);
      }, 2000);
    }, 500);

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
