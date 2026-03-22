const pty = require('node-pty');

class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this.ptyProcess = null;
    this.projectDir = null;
  }

  _buildEnv() {
    return {
      ...process.env,
      FORCE_COLOR: '1',
      FORGE_ENABLED: 'true',
    };
  }

  spawn(config, onData) {
    const { projectDir, prompt, prdFile } = config;
    this.projectDir = projectDir;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: projectDir,
      env: this._buildEnv(),
    });

    let step = 0; // 0=waiting for shell, 1=claude sent, 2=workflow sent
    let buffer = '';

    this.ptyProcess.onData((data) => {
      if (onData) onData(data);

      if (step >= 2) return;
      buffer += data;

      if (step === 0 && buffer.length > 50) {
        step = 1;
        setTimeout(() => {
          this.ptyProcess.write('claude --dangerously-skip-permissions\r');
        }, 500);
      }

      if (step === 1 && buffer.length > 500) {
        const stripped = buffer.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
        if (stripped.includes('Tips') || stripped.includes('Claude Code') || stripped.includes('claude-code') || stripped.includes('\n> ')) {
          step = 2;
          setTimeout(() => {
            this.ptyProcess.write('/workflow\r');
          }, 1500);
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
