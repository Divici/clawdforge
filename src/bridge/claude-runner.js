const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Forge protocol instructions written as a rules file in the target project.
// Claude CLI reads .claude/rules/*.md on startup — this persists through
// all skill invocations including /workflow, /presearch, /build.
const FORGE_PROTOCOL_RULES = `Emit [FORGE:TYPE key=value] markers on their own line, in addition to normal output.
ALWAYS prefer QUESTION with multiple OPTIONs over TEXT_QUESTION. Only use TEXT_QUESTION when there are truly no predefined choices.
Every OPTION MUST have at least 2 pros (✓) and 1 con (✗) separated by pipes. Never omit pros/cons.
[FORGE:QUESTION id=q1] What database should we use?
[FORGE:OPTION id=q1 recommended=true] SQLite | ✓ Zero config, no setup needed | ✓ Embedded, single file | ✗ No concurrent writes | Best when: local-first single-user
[FORGE:OPTION id=q1] PostgreSQL | ✓ Mature and battle-tested | ✓ Complex queries and joins | ✗ Requires running a server | Best when: multi-user production
[FORGE:OPTION id=q1] MongoDB | ✓ Flexible document schema | ✓ Easy horizontal scaling | ✗ No relational joins | Best when: unstructured data
[FORGE:OPTION_END id=q1]
[FORGE:DECISION] Database: SQLite
[FORGE:TEXT_QUESTION id=q2] What is your project name?
[FORGE:LOOP loop=1 name=Constraints]
[FORGE:REGISTRY] [{"id":"R-001","text":"desc","priority":"Must-have"}]
[FORGE:MODE mode=build]
[FORGE:PHASE phase=scaffold total=5 current=1]
[FORGE:TASK status=complete] commit message
[FORGE:AGENT_SPAWN count=3]
[FORGE:AGENT_DONE count=2]
[FORGE:COMPLETE] {"tests":127}
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
   * Write the forge protocol rules file into BOTH:
   * 1. Global ~/.claude/rules/ (guaranteed to be read by Claude CLI)
   * 2. Target project's .claude/rules/ (project-local, may or may not be read)
   */
  _installForgeRules(projectDir) {
    this._rulesPaths = [];

    // Global rules dir — this is where the user's other rules live
    // (commit-message.md, tdd.md, etc.) so we know Claude reads it
    const globalRulesDir = path.join(os.homedir(), '.claude', 'rules');
    try {
      fs.mkdirSync(globalRulesDir, { recursive: true });
      const globalPath = path.join(globalRulesDir, RULES_FILENAME);
      fs.writeFileSync(globalPath, FORGE_PROTOCOL_RULES, 'utf-8');
      this._rulesPaths.push(globalPath);
    } catch (err) {
      console.error('Failed to write global forge rules:', err.message);
    }

    // Project-local rules dir — belt and suspenders
    const localRulesDir = path.join(projectDir, '.claude', 'rules');
    try {
      fs.mkdirSync(localRulesDir, { recursive: true });
      const localPath = path.join(localRulesDir, RULES_FILENAME);
      fs.writeFileSync(localPath, FORGE_PROTOCOL_RULES, 'utf-8');
      this._rulesPaths.push(localPath);
    } catch (err) {
      // Not critical — global rules are the primary mechanism
    }
  }

  /**
   * Remove all forge protocol rules files after Claude exits.
   */
  _removeForgeRules() {
    if (this._rulesPaths) {
      for (const p of this._rulesPaths) {
        try {
          fs.unlinkSync(p);
        } catch {
          // Ignore — file may already be gone
        }
      }
      this._rulesPaths = [];
    }
  }

  spawn(config, onData) {
    const { projectDir, prompt, prdFile } = config;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

    // Install forge protocol rules in the target project
    this._installForgeRules(projectDir);

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 500,
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
