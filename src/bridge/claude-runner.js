const pty = require('node-pty');
const path = require('path');

// Forge Output Protocol preamble — injected as Claude's first message
// so it knows to emit structured markers for the dashboard UI.
const FORGE_PREAMBLE = `You are running inside Claw'd Forge, a visual dashboard. You MUST emit structured [FORGE:] markers on their own line throughout your output so the dashboard can render interactive UI cards. This is critical — without markers, the user sees nothing.

MARKER FORMAT: [FORGE:TYPE key=value] content

REQUIRED MARKERS — emit these at the appropriate times:

When presenting a question with options:
[FORGE:QUESTION id=q1] Question text
[FORGE:OPTION id=q1 recommended=true] OptionName | ✓ pro | ✗ con | Best when: context
[FORGE:OPTION id=q1] OptionName | ✓ pro | ✗ con | Best when: context
[FORGE:OPTION_END id=q1]

For open-ended questions (no predefined options):
[FORGE:TEXT_QUESTION id=q2] Question text

When a decision is locked:
[FORGE:DECISION] Summary of the locked decision

For requirements registry:
[FORGE:REGISTRY] [{"id":"R-001","text":"description","priority":"Must-have"}]

Loop/phase transitions:
[FORGE:LOOP loop=1 name=Constraints]
[FORGE:MODE mode=presearch]
[FORGE:MODE mode=build]
[FORGE:PHASE phase=scaffold total=5 current=1]

During build:
[FORGE:TASK status=complete] commit message
[FORGE:AGENT_SPAWN count=3]
[FORGE:AGENT_DONE count=2]
[FORGE:BLOCKER type=api-key] Description
[FORGE:COMPLETE] {"tests":127,"phases":5}

RULES:
- Emit markers IN ADDITION to your normal output, not instead of it
- Each marker goes on its own line
- Increment question ids: q1, q2, q3...
- For OPTION: separate name, pros (✓), cons (✗), and "Best when:" with pipe |
- Set recommended=true on your recommended option
- ALWAYS emit OPTION_END after listing all options for a question
- For REGISTRY: content is a JSON array
- Emit LOOP marker at each presearch loop transition
- Emit MODE marker when switching between presearch and build

Now run the workflow. /workflow`;

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

    // Watch output for Claude's ready signal, then send forge preamble + /workflow
    let claudeSent = false;
    let preambleSent = false;
    let buffer = '';

    this.ptyProcess.onData((data) => {
      if (onData) onData(data);

      if (!claudeSent || !preambleSent) {
        buffer += data;

        // Send claude command after shell prompt appears
        if (!claudeSent && buffer.length > 50) {
          claudeSent = true;
          setTimeout(() => {
            this.ptyProcess.write(`claude --dangerously-skip-permissions\r`);
          }, 300);
        }

        // Wait for Claude CLI to be ready, then send forge preamble + /workflow
        if (claudeSent && !preambleSent) {
          if (buffer.includes('\\') || buffer.includes('>') || buffer.includes('Human:') || buffer.includes('claude-code') || buffer.includes('Tips')) {
            const timeSinceClaude = buffer.length;
            if (timeSinceClaude > 500) {
              preambleSent = true;
              setTimeout(() => {
                // Send the forge preamble which ends with /workflow
                this.ptyProcess.write(FORGE_PREAMBLE + '\r');
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
