const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { JsonlParser } = require('./jsonl-parser');
const { ForgeStateWatcher } = require('./forge-state-watcher');
const { generateGateCheckScript } = require('./gate-check');

const RULES_FILENAME = 'forge-protocol.md';

/**
 * Build the forge protocol rules content for the given run mode.
 */
function buildForgeProtocolRules(runMode) {
  const modeRules = runMode === 'interactive'
    ? `## Interactive Mode

- Ask 3-5 questions per presearch loop
- For EACH question batch:
  1. Write questions to presearch-state.json with status "pending"
  2. Set state.json: status="waiting_for_input", presearch.waitingForInput=true, presearch.inputRequestId=<first pending question id>
  3. STOP your turn (the Stop hook will block you until the user answers)
  4. When unblocked, read .forge/user-input.json for the answer
  5. Update the question status to "answered", clear waitingForInput, continue`
    : `## Autonomous Mode

- Ask 3-5 questions per presearch loop AND answer them yourself with your best recommendation
- Set ALL question statuses to "answered" with your chosen answer
- Do NOT set waitingForInput to true
- Proceed through all 5 loops without pausing
- After presearch is complete, transition mode to "build" and begin building`;

  return `# Forge Protocol — Disk State

You are running inside Claw'd Forge, a visual dashboard. Your text output is NOT displayed to the user.
The dashboard reads \`.forge/\` JSON files for all UI state. You MUST keep these files updated.

## CRITICAL: You MUST write these files using the Write tool

A Stop hook validates \`.forge/\` files after every turn. Your turn WILL BE BLOCKED if files are missing or invalid.

### \`.forge/state.json\` — Master State (REQUIRED every turn)

Write this file at the START of your work and UPDATE it whenever mode, status, loop, or phase changes.
Always include \`updatedAt\` with the current ISO timestamp.

EXAMPLE (copy this structure exactly):
\`\`\`json
{
  "version": 1,
  "mode": "presearch",
  "status": "running",
  "runMode": "${runMode}",
  "sessionId": "your-session-id",
  "projectName": "project-dir-name",
  "startedAt": "2026-03-23T10:00:00Z",
  "updatedAt": "2026-03-23T10:00:00Z",
  "presearch": {
    "status": "running",
    "currentLoop": 1,
    "currentLoopName": "Constraints",
    "completedLoops": [],
    "totalLoops": 5,
    "waitingForInput": false,
    "inputRequestId": null
  },
  "build": {
    "status": "idle",
    "phases": [],
    "currentPhase": null,
    "completedPhases": [],
    "tasksTotal": 0,
    "tasksCompleted": 0,
    "activeAgents": 0,
    "blockers": []
  },
  "cost": { "totalUsd": 0, "turns": 0 },
  "error": null
}
\`\`\`

### \`.forge/presearch-state.json\` — Presearch Detail (REQUIRED during presearch)

Write and update during presearch mode. Update every time you extract requirements, ask a question, or make a decision.

EXAMPLE (copy this structure exactly):
\`\`\`json
{
  "version": 1,
  "requirements": [
    { "id": "R-001", "text": "Must support offline mode", "source": "PRD 2.1", "category": "Functional", "priority": "Must-have" }
  ],
  "questions": [
    {
      "id": "q1",
      "loop": 1,
      "loopName": "Constraints",
      "type": "choice",
      "question": "What database should we use?",
      "options": [
        { "name": "SQLite", "pros": ["Zero config", "Embedded"], "cons": ["No concurrent writes"], "bestWhen": "local-first single-user", "recommended": true },
        { "name": "PostgreSQL", "pros": ["Battle-tested", "Complex queries"], "cons": ["Requires server"], "bestWhen": "multi-user production", "recommended": false }
      ],
      "status": "answered",
      "answer": "SQLite",
      "answeredAt": "2026-03-23T10:02:15Z"
    }
  ],
  "decisions": [
    { "id": "d1", "loop": 1, "summary": "Database: SQLite", "questionId": "q1", "decidedAt": "2026-03-23T10:02:15Z" }
  ]
}
\`\`\`

### \`.forge/build-state.json\` — Build Progress (REQUIRED during build)

Write and update during build mode.

EXAMPLE:
\`\`\`json
{
  "version": 1,
  "phases": [
    {
      "name": "scaffold",
      "status": "in_progress",
      "tasks": [
        { "id": "t1", "description": "Init project", "status": "running", "commit": null, "completedAt": null }
      ]
    }
  ],
  "agents": { "active": 0, "totalSpawned": 0, "totalCompleted": 0 },
  "summary": null
}
\`\`\`

## Writing Rules

- Use the Write tool for all \`.forge/\` file writes
- Write COMPLETE valid JSON every time (not partial updates)
- Always update \`updatedAt\` in state.json on every write
- Do NOT emit [FORGE:*] markers in text output — they are deprecated

${modeRules}
`;
}

class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this._child = null;
    this._projectDir = null;
    this._installedPaths = [];
    this._watcher = null;
    this._onText = null;
    this.sessionId = null;
  }

  _buildArgs(prompt, resumeId) {
    const args = [];
    if (resumeId) {
      args.push('--resume', resumeId);
    }
    args.push('-p', prompt);
    args.push('--output-format', 'stream-json');
    args.push('--verbose');
    args.push('--dangerously-skip-permissions');
    return args;
  }

  _buildEnv() {
    return {
      ...process.env,
      FORCE_COLOR: '0',
      FORGE_ENABLED: 'true',
    };
  }

  /**
   * Create .forge/ directory and add it to .gitignore.
   */
  _installForgeDir(projectDir) {
    const forgeDir = path.join(projectDir, '.forge');
    fs.mkdirSync(forgeDir, { recursive: true });

    const gitignorePath = path.join(projectDir, '.gitignore');
    try {
      const content = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf-8')
        : '';
      if (!content.includes('.forge/')) {
        fs.appendFileSync(gitignorePath, '\n.forge/\n', 'utf-8');
      }
    } catch { /* non-critical */ }
  }

  /**
   * Install the gate-check Stop hook into the target project.
   */
  _installGateHook(projectDir) {
    // Write gate-check script into .forge/
    const hookScript = generateGateCheckScript();
    const hookPath = path.join(projectDir, '.forge', 'gate-check.js');
    fs.writeFileSync(hookPath, hookScript, 'utf-8');
    this._installedPaths.push(hookPath);

    // Write/merge hook config into .claude/settings.local.json
    const settingsDir = path.join(projectDir, '.claude');
    fs.mkdirSync(settingsDir, { recursive: true });

    const settingsPath = path.join(settingsDir, 'settings.local.json');
    let settings = {};
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch { /* doesn't exist yet */ }

    if (!settings.hooks) settings.hooks = {};
    settings.hooks.Stop = [
      { hooks: [{ type: 'command', command: 'node .forge/gate-check.js' }] }
    ];

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  /**
   * Write the forge protocol rules file into global and project rules dirs.
   */
  _installForgeRules(projectDir, runMode) {
    const rules = buildForgeProtocolRules(runMode);

    const globalRulesDir = path.join(os.homedir(), '.claude', 'rules');
    try {
      fs.mkdirSync(globalRulesDir, { recursive: true });
      const globalPath = path.join(globalRulesDir, RULES_FILENAME);
      fs.writeFileSync(globalPath, rules, 'utf-8');
      this._installedPaths.push(globalPath);
    } catch (err) {
      console.error('Failed to write global forge rules:', err.message);
    }

    const localRulesDir = path.join(projectDir, '.claude', 'rules');
    try {
      fs.mkdirSync(localRulesDir, { recursive: true });
      const localPath = path.join(localRulesDir, RULES_FILENAME);
      fs.writeFileSync(localPath, rules, 'utf-8');
      this._installedPaths.push(localPath);
    } catch {
      // Not critical — global rules are the primary mechanism
    }
  }

  /**
   * Start polling .forge/ files for state changes.
   */
  _startWatcher() {
    if (!this._projectDir) return;
    const forgeDir = path.join(this._projectDir, '.forge');
    this._watcher = new ForgeStateWatcher(this.bus, forgeDir, 500);
    this._watcher.start();
  }

  /**
   * Remove all installed files and clean up hook config.
   */
  _cleanup() {
    for (const p of this._installedPaths) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
    this._installedPaths = [];

    // Remove our Stop hook from settings.local.json (don't delete the file)
    if (this._projectDir) {
      const settingsPath = path.join(this._projectDir, '.claude', 'settings.local.json');
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.hooks?.Stop) {
          delete settings.hooks.Stop;
          if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        }
      } catch { /* ignore */ }
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
        // Keep onText callback for backward compatibility (Phase 1 parallel)
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
   * Spawn Claude CLI with disk-state architecture.
   * Installs .forge/ dir, gate-check hook, and protocol rules.
   * Starts ForgeStateWatcher to poll state files.
   */
  spawn(config) {
    const { projectDir, prompt, onText, runMode = 'autonomous' } = config;
    this._projectDir = projectDir;
    this._onText = onText || null;

    // Install disk-state infrastructure
    this._installForgeDir(projectDir);
    this._installGateHook(projectDir);
    this._installForgeRules(projectDir, runMode);

    // Build prompt with mode prefix
    const modePrefix = runMode === 'interactive'
      ? 'Run in INTERACTIVE mode. For each presearch question, set waitingForInput=true and wait for user-input.json.'
      : 'Run in AUTONOMOUS mode. Make all presearch decisions yourself using best judgment. Do not wait for user input.';

    const fullPrompt = `${modePrefix}\n\n${prompt || 'Run the /workflow skill'}`;
    const args = this._buildArgs(fullPrompt);

    const child = childProcess.spawn('claude', args, {
      cwd: projectDir,
      env: this._buildEnv(),
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._wireChild(child);
    this._startWatcher();
    return child;
  }

  /**
   * Write user input to .forge/user-input.json for interactive mode.
   */
  writeUserInput(requestId, answer) {
    if (!this._projectDir) {
      throw new Error('Cannot write user input: no project directory');
    }
    const inputPath = path.join(this._projectDir, '.forge', 'user-input.json');
    fs.writeFileSync(inputPath, JSON.stringify({
      version: 1,
      requestId,
      answer,
      answeredAt: new Date().toISOString(),
    }, null, 2), 'utf-8');
  }

  /**
   * Send a response by spawning a new --resume process.
   * @deprecated Use writeUserInput for interactive mode instead.
   */
  respond(text) {
    if (!this.sessionId) {
      throw new Error('Cannot respond: no session ID available');
    }

    if (this._child) {
      this._child.kill();
      this._child = null;
    }

    const args = this._buildArgs(text, this.sessionId);
    const child = childProcess.spawn('claude', args, {
      cwd: this._projectDir,
      env: this._buildEnv(),
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this._wireChild(child);
    return child;
  }

  kill() {
    if (this._watcher) {
      this._watcher.stop();
      this._watcher = null;
    }
    this._cleanup();
    if (this._child) {
      this._child.kill();
      this._child = null;
    }
  }
}

module.exports = { ClaudeRunner, buildForgeProtocolRules };
