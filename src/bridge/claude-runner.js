const pty = require('node-pty');
const path = require('path');
const fs = require('fs');

// Forge protocol instructions written as a rules file in the target project.
// Claude CLI reads .claude/rules/*.md on startup — this persists through
// all skill invocations including /workflow, /presearch, /build.
const FORGE_PROTOCOL_RULES = `# Forge Output Protocol

You are running inside Claw'd Forge, a visual dashboard app. You MUST emit structured markers so the dashboard can render UI cards. Without these markers, the user sees a blank screen.

## Marker Format

Each marker goes on its own line: \`[FORGE:TYPE key=value] content\`

## When Presenting a Decision with Options

\`\`\`
[FORGE:QUESTION id=q1] What database should we use?
[FORGE:OPTION id=q1 recommended=true] SQLite | ✓ Zero config, embedded | ✓ Perfect for single-user | ✗ No concurrent writes | Best when: single user, local-first
[FORGE:OPTION id=q1] PostgreSQL | ✓ Mature, relational | ✗ Requires server setup | Best when: complex queries
[FORGE:OPTION_END id=q1]
\`\`\`

Increment question ids: q1, q2, q3. Set \`recommended=true\` on your pick. Separate name, pros (✓), cons (✗), "Best when:" with \`|\`.

## When Asking an Open-Ended Question

\`\`\`
[FORGE:TEXT_QUESTION id=q1] What is your timeline?
\`\`\`

## When Locking a Decision

\`\`\`
[FORGE:DECISION] Database: SQLite — embedded, zero config
\`\`\`

## Requirements Registry

\`\`\`
[FORGE:REGISTRY] [{"id":"R-001","text":"Shorten a URL","priority":"Must-have"},{"id":"R-002","text":"Redirect","priority":"Must-have"}]
\`\`\`

## Loop and Mode Transitions

\`\`\`
[FORGE:LOOP loop=1 name=Constraints]
[FORGE:MODE mode=presearch]
[FORGE:MODE mode=build]
\`\`\`

## During Build

\`\`\`
[FORGE:PHASE phase=scaffold total=5 current=1]
[FORGE:TASK status=complete] feat(db): add user model
[FORGE:AGENT_SPAWN count=3]
[FORGE:AGENT_DONE count=2]
[FORGE:BLOCKER type=api-key] Need OpenAI API key
[FORGE:COMPLETE] {"tests":127,"phases":5}
\`\`\`

## Rules

- Emit markers IN ADDITION to your normal output, not instead of it
- Each marker MUST be on its own line
- ALWAYS emit OPTION_END after listing all options
- For REGISTRY, content is a JSON array
- Emit LOOP at each presearch loop transition
- Emit MODE when switching between presearch and build
`;

const RULES_FILENAME = 'forge-protocol.md';

class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this.ptyProcess = null;
    this._rulesPath = null;
  }

  _buildEnv() {
    return {
      ...process.env,
      FORCE_COLOR: '1',
      FORGE_ENABLED: 'true',
    };
  }

  /**
   * Write the forge protocol rules file into the target project's .claude/rules/ dir.
   * Claude CLI reads these automatically on startup.
   */
  _installForgeRules(projectDir) {
    const rulesDir = path.join(projectDir, '.claude', 'rules');
    try {
      fs.mkdirSync(rulesDir, { recursive: true });
      this._rulesPath = path.join(rulesDir, RULES_FILENAME);
      fs.writeFileSync(this._rulesPath, FORGE_PROTOCOL_RULES, 'utf-8');
    } catch (err) {
      console.error('Failed to write forge rules:', err.message);
      this._rulesPath = null;
    }
  }

  /**
   * Remove the forge protocol rules file after Claude exits.
   */
  _removeForgeRules() {
    if (this._rulesPath) {
      try {
        fs.unlinkSync(this._rulesPath);
      } catch {
        // Ignore — file may already be gone
      }
      this._rulesPath = null;
    }
  }

  spawn(config, onData) {
    const { projectDir, prompt, prdFile } = config;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

    // Install forge protocol rules in the target project
    this._installForgeRules(projectDir);

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

      // Step 0 -> 1: Send claude command once shell prompt appears
      if (step === 0 && buffer.length > 50) {
        step = 1;
        setTimeout(() => {
          this.ptyProcess.write('claude --dangerously-skip-permissions\r');
        }, 500);
      }

      // Step 1 -> 2: Wait for Claude CLI ready, then send /workflow
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
      this._removeForgeRules();
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
      this._removeForgeRules();
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}

module.exports = { ClaudeRunner };
