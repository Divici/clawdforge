const pty = require('node-pty');
const path = require('path');

// Short forge protocol preamble — sent before /workflow
// Kept minimal so Claude processes it quickly
const FORGE_PREAMBLE = [
  'IMPORTANT: You are inside Claw\'d Forge dashboard. Emit [FORGE:] markers on their own line so the UI renders cards.',
  'Format: [FORGE:TYPE key=value] content',
  'Questions: [FORGE:QUESTION id=q1] text, then [FORGE:OPTION id=q1 recommended=true] Name | ✓ pro | ✗ con | Best when: x, then [FORGE:OPTION_END id=q1]',
  'Text input: [FORGE:TEXT_QUESTION id=q1] text',
  'Decisions: [FORGE:DECISION] summary',
  'Registry: [FORGE:REGISTRY] [{json array}]',
  'Loops: [FORGE:LOOP loop=1 name=Constraints]',
  'Modes: [FORGE:MODE mode=presearch] or [FORGE:MODE mode=build]',
  'Build: [FORGE:PHASE phase=name total=N current=M], [FORGE:TASK status=complete] msg, [FORGE:AGENT_SPAWN count=N], [FORGE:AGENT_DONE count=N], [FORGE:COMPLETE] {json}',
  'Emit markers IN ADDITION to normal output. Without them the user sees nothing.',
].join(' ');

class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this.ptyProcess = null;
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
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: projectDir,
      env: this._buildEnv(),
    });

    let step = 0; // 0=waiting for shell, 1=claude sent, 2=preamble sent, 3=workflow sent
    let buffer = '';

    this.ptyProcess.onData((data) => {
      if (onData) onData(data);

      if (step >= 3) return; // All commands sent
      buffer += data;

      // Step 0 -> 1: Send claude command once shell prompt appears
      if (step === 0 && buffer.length > 50) {
        step = 1;
        setTimeout(() => {
          this.ptyProcess.write('claude --dangerously-skip-permissions\r');
        }, 500);
      }

      // Step 1 -> 2: Wait for Claude CLI ready, send short preamble
      if (step === 1 && buffer.length > 500) {
        // Look for Claude CLI ready signals
        const stripped = buffer.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
        if (stripped.includes('Tips') || stripped.includes('Claude Code') || stripped.includes('claude-code') || stripped.includes('\n> ')) {
          step = 2;
          setTimeout(() => {
            this.ptyProcess.write(FORGE_PREAMBLE + '\r');
          }, 1500);

          // Step 2 -> 3: Send /workflow after preamble is processed
          setTimeout(() => {
            step = 3;
            this.ptyProcess.write('/workflow\r');
          }, 4000);
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
