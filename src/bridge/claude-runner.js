const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { JsonlParser } = require('./jsonl-parser');

// Forge protocol instructions written as a rules file in the target project.
// Claude CLI reads .claude/rules/*.md on startup — this persists through
// all skill invocations including /workflow, /presearch, /build.
const FORGE_PROTOCOL_RULES = `CRITICAL PACING RULE: Ask exactly ONE question per turn. After emitting a QUESTION (with its OPTIONs) or TEXT_QUESTION, STOP immediately. Do not ask another question in the same turn. Do not continue to the next subsection. Wait for the user to answer before proceeding. This is the most important behavioral rule.

Emit [FORGE:TYPE key=value] markers on their own line, in addition to normal output.
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
    this._child = null;
    this._projectDir = null;
    this._rulesPaths = [];
    this._onText = null;
    this.sessionId = null;
  }

  _buildArgs() {
    return [
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ];
  }

  /**
   * Write a user message to the child's stdin as stream-json.
   */
  _writeUserMessage(text) {
    if (!this._child || !this._child.stdin || this._child.stdin.destroyed) return;
    const message = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text }],
      },
    });
    this._child.stdin.write(message + '\n');
  }

  _buildEnv() {
    return {
      ...process.env,
      FORCE_COLOR: '0',
      FORGE_ENABLED: 'true',
    };
  }

  /**
   * Write the forge protocol rules file into BOTH:
   * 1. Global ~/.claude/rules/ (guaranteed to be read by Claude CLI)
   * 2. Target project's .claude/rules/ (project-local)
   */
  _installForgeRules(projectDir) {
    this._rulesPaths = [];

    const globalRulesDir = path.join(os.homedir(), '.claude', 'rules');
    try {
      fs.mkdirSync(globalRulesDir, { recursive: true });
      const globalPath = path.join(globalRulesDir, RULES_FILENAME);
      fs.writeFileSync(globalPath, FORGE_PROTOCOL_RULES, 'utf-8');
      this._rulesPaths.push(globalPath);
    } catch (err) {
      console.error('Failed to write global forge rules:', err.message);
    }

    const localRulesDir = path.join(projectDir, '.claude', 'rules');
    try {
      fs.mkdirSync(localRulesDir, { recursive: true });
      const localPath = path.join(localRulesDir, RULES_FILENAME);
      fs.writeFileSync(localPath, FORGE_PROTOCOL_RULES, 'utf-8');
      this._rulesPaths.push(localPath);
    } catch {
      // Not critical — global rules are the primary mechanism
    }
  }

  _removeForgeRules() {
    if (this._rulesPaths) {
      for (const p of this._rulesPaths) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
      this._rulesPaths = [];
    }
  }

  /**
   * Handle a parsed JSONL event from Claude CLI stdout.
   */
  _handleEvent(event) {
    switch (event.type) {
      case 'system':
        if (event.subtype === 'init' && event.session_id) {
          this.sessionId = event.session_id;
          this.bus.emit('claude:session', {
            sessionId: event.session_id,
            tools: event.tools || [],
          });
        }
        break;

      case 'assistant':
        this._handleAssistantMessage(event.message);
        break;

      case 'user':
        this._handleUserMessage(event.message);
        break;

      case 'result':
        this.bus.emit('claude:cost', {
          sessionId: event.session_id,
          totalCostUsd: event.total_cost_usd,
          durationMs: event.duration_ms,
          stopReason: event.stop_reason,
          isError: event.is_error,
        });
        this.bus.emit('claude:turn-end', {
          sessionId: event.session_id,
          stopReason: event.stop_reason,
        });
        break;
    }
  }

  _handleAssistantMessage(message) {
    if (!message || !message.content) return;
    for (const block of message.content) {
      if (block.type === 'text') {
        this.bus.emit('claude:text', { text: block.text });
        if (this._onText) this._onText(block.text);
      } else if (block.type === 'tool_use') {
        this.bus.emit('claude:tool-use', {
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }
  }

  _handleUserMessage(message) {
    if (!message || !message.content) return;
    for (const block of message.content) {
      if (block.type === 'tool_result') {
        this.bus.emit('claude:tool-result', {
          tool_use_id: block.tool_use_id,
          content: block.content,
        });
      }
    }
  }

  /**
   * Wire up JSONL parsing and event handling on a child process.
   */
  _wireChild(child) {
    this._child = child;

    const parser = new JsonlParser(
      (event) => this._handleEvent(event),
      (err, line) => console.warn('JSONL parse error:', err.message, line?.slice(0, 100)),
    );

    child.stdout.on('data', (chunk) => parser.feed(chunk.toString()));
    child.stdout.on('end', () => parser.flush());

    let stderrBuffer = '';
    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          this.bus.emit('claude:error', { message: trimmed });
        }
      }
    });

    child.on('close', (code) => {
      this.bus.emit('claude:exit', { code });
    });
  }

  /**
   * Spawn Claude CLI in bidirectional stream-json mode.
   * One long-lived process — responses are sent via stdin.
   */
  spawn(config) {
    const { projectDir, prompt, onText } = config;
    this._projectDir = projectDir;
    this._onText = onText || null;

    this._installForgeRules(projectDir);

    const args = this._buildArgs();
    const child = childProcess.spawn('claude', args, {
      cwd: projectDir,
      env: this._buildEnv(),
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this._wireChild(child);

    // Send initial prompt via stdin (not -p, which doesn't work with --input-format stream-json)
    this._writeUserMessage(prompt || 'Run the /workflow skill');

    return child;
  }

  /**
   * Send a user response to the running Claude process via stdin.
   * No respawn — writes directly to the existing process.
   */
  respond(text) {
    if (!this._child || !this._child.stdin || this._child.stdin.destroyed) {
      throw new Error('Cannot respond: no running Claude process');
    }
    this._writeUserMessage(text);
  }

  kill() {
    if (this._child) {
      this._removeForgeRules();
      this._child.kill();
      this._child = null;
    }
  }
}

module.exports = { ClaudeRunner };
