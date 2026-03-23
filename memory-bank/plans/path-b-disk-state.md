# Path B: Disk-State Architecture Refactor

## Overview

Replace marker-based output parsing with a disk-state architecture where Claude writes structured JSON to `.forge/` files, a Stop hook enforces compliance, and the dashboard polls those files for UI state. Adds autonomous mode (Claude makes all decisions) alongside interactive mode.

**Why:** The current marker-based approach (`[FORGE:*]` in Claude's text output) is fundamentally fragile — Claude must do analysis AND format output simultaneously, `--resume` freezes on long sessions, and the build phase produces tool calls not markers. Sebastian's factory proves that disk-state + file polling is reliable at scale.

**Scope:** Full bridge layer rewrite, component data source migration, new autonomous mode, Stop hook quality gate.

---

## 1. State Schema Design

All state lives in `<projectDir>/.forge/`. The runner creates this directory on spawn and adds it to `.gitignore`.

### 1.1 `.forge/state.json` — Master State

Single source of truth. Polled by ForgeStateWatcher every 500ms.

```json
{
  "version": 1,
  "mode": "presearch",
  "status": "running",
  "sessionId": "sess-abc123",
  "projectName": "my-project",
  "startedAt": "2026-03-23T10:00:00Z",
  "updatedAt": "2026-03-23T10:05:32Z",
  "runMode": "autonomous",

  "presearch": {
    "status": "running",
    "currentLoop": 2,
    "currentLoopName": "Discovery",
    "completedLoops": ["Constraints"],
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

  "cost": {
    "totalUsd": 0.00,
    "turns": 0
  },

  "error": null
}
```

**Field enums:**
- `mode`: `"presearch"` | `"build"` | `"complete"` | `"error"`
- `status`: `"running"` | `"paused"` | `"waiting_for_input"` | `"complete"` | `"error"`
- `runMode`: `"autonomous"` | `"interactive"`
- `presearch.status`: `"running"` | `"complete"`
- `build.status`: `"idle"` | `"running"` | `"complete"`
- `build.blockers[]`: `{ id: string, type: string, message: string, resolved: boolean }`

### 1.2 `.forge/presearch-state.json` — Presearch Detail

```json
{
  "version": 1,
  "requirements": [
    {
      "id": "R-001",
      "text": "Must support offline mode",
      "source": "PRD 2.1",
      "category": "Functional",
      "priority": "Must-have"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "loop": 1,
      "loopName": "Constraints",
      "type": "choice",
      "question": "What database should we use?",
      "options": [
        {
          "name": "SQLite",
          "pros": ["Zero config", "Embedded single file"],
          "cons": ["No concurrent writes"],
          "bestWhen": "local-first single-user",
          "recommended": true
        }
      ],
      "status": "answered",
      "answer": "SQLite",
      "answeredAt": "2026-03-23T10:02:15Z"
    }
  ],
  "decisions": [
    {
      "id": "d1",
      "loop": 1,
      "summary": "Database: SQLite — embedded, zero config",
      "questionId": "q1",
      "decidedAt": "2026-03-23T10:02:15Z"
    }
  ]
}
```

**Field enums:**
- `questions[].status`: `"pending"` | `"answered"` | `"skipped"`
- `questions[].type`: `"choice"` | `"text"`
- In autonomous mode: all questions arrive with `status: "answered"`
- In interactive mode: pending questions have `status: "pending"`

### 1.3 `.forge/build-state.json` — Build Detail

```json
{
  "version": 1,
  "phases": [
    {
      "name": "scaffold",
      "status": "complete",
      "tasks": [
        {
          "id": "t1",
          "description": "Initialize project structure",
          "status": "complete",
          "commit": "feat(scaffold): init project",
          "completedAt": "2026-03-23T10:15:00Z"
        }
      ]
    }
  ],
  "agents": {
    "active": 0,
    "totalSpawned": 5,
    "totalCompleted": 5
  },
  "summary": null
}
```

**Phase statuses:** `"pending"` | `"in_progress"` | `"complete"`
**Task statuses:** `"pending"` | `"running"` | `"complete"` | `"failed"`
**Summary (on completion):** `{ tests: number, phases: number, commits: number, totalTasks: number }`

### 1.4 `.forge/user-input.json` — Interactive Mode Input

Written by the dashboard (via main process), read by Claude.

```json
{
  "version": 1,
  "requestId": "q2",
  "answer": "My awesome project",
  "answeredAt": "2026-03-23T10:03:00Z"
}
```

---

## 2. Stop Hook Design

### 2.1 How It Works

The Stop hook fires when Claude tries to finish a turn. It validates `.forge/` state files.
- **Exit 0**: files valid, Claude may stop
- **Exit 2**: files invalid/missing, turn is BLOCKED, stderr is fed back to Claude as feedback
- **Other exit codes**: logged but non-blocking

This is the key compliance mechanism — Claude cannot finish a turn without valid state files.

### 2.2 Hook Configuration

Installed at `<projectDir>/.claude/settings.local.json` (local scope, gitignored, won't conflict with checked-in settings):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .forge/gate-check.js"
          }
        ]
      }
    ]
  }
}
```

**Why `settings.local.json`:** Merges with but doesn't overwrite `.claude/settings.json`. The `.local.json` file is gitignored by default, so we won't pollute the target project's repo.

### 2.3 Gate Check Script

Located at `<projectDir>/.forge/gate-check.js` (inside .forge/ so it's cleaned up with the rest):

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const forgeDir = path.join(process.cwd(), '.forge');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function validate() {
  const errors = [];

  const state = readJSON(path.join(forgeDir, 'state.json'));
  if (!state) {
    errors.push('MISSING: .forge/state.json — write this file before completing your turn');
    return errors;
  }

  if (!state.mode) errors.push('INVALID: state.json missing "mode" field');
  if (!state.status) errors.push('INVALID: state.json missing "status" field');
  if (!state.updatedAt) errors.push('INVALID: state.json missing "updatedAt" field');

  if (state.mode === 'presearch') {
    const ps = readJSON(path.join(forgeDir, 'presearch-state.json'));
    if (!ps) {
      errors.push('MISSING: .forge/presearch-state.json — required during presearch mode');
    } else if (!Array.isArray(ps.questions)) {
      errors.push('INVALID: presearch-state.json missing "questions" array');
    }
  }

  if (state.mode === 'build') {
    const bs = readJSON(path.join(forgeDir, 'build-state.json'));
    if (!bs) {
      errors.push('MISSING: .forge/build-state.json — required during build mode');
    } else if (!Array.isArray(bs.phases)) {
      errors.push('INVALID: build-state.json missing "phases" array');
    }
  }

  return errors;
}

const errors = validate();
if (errors.length > 0) {
  console.error('=== FORGE GATE CHECK FAILED ===');
  errors.forEach(e => console.error(`  - ${e}`));
  console.error('Fix these issues and write the required .forge/ files before completing your turn.');
  process.exit(2); // EXIT 2 = BLOCK the stop
}
process.exit(0);
```

### 2.4 Interactive Mode Gate Extension

For interactive mode, the gate check also blocks when Claude sets `waitingForInput: true` but the user hasn't answered yet:

```javascript
// Additional check in validate():
if (state.status === 'waiting_for_input' && state.presearch?.inputRequestId) {
  const input = readJSON(path.join(forgeDir, 'user-input.json'));
  if (!input || input.requestId !== state.presearch.inputRequestId) {
    errors.push(
      `WAITING: User has not answered question ${state.presearch.inputRequestId} yet. ` +
      'Read .forge/user-input.json — when the requestId matches, continue with the answer.'
    );
  }
}
```

This creates a natural pause: Claude tries to stop → hook blocks → Claude sees "user hasn't answered yet" → Claude waits and retries. When the user answers (dashboard writes `user-input.json`), the next stop attempt passes.

**Risk:** Claude may retry rapidly. The hook should be efficient (< 10ms). If Claude burns tokens retrying, we may need to add a `sleep 2` to the hook or use a different approach.

---

## 3. Claude Runner Refactor

### 3.1 New File: `src/bridge/forge-state-watcher.js`

Replaces StageParser as the UI state data source.

```javascript
class ForgeStateWatcher {
  constructor(bus, forgeDir, interval = 500) {
    this.bus = bus;
    this.forgeDir = forgeDir;
    this.interval = interval;
    this._timer = null;
    this._lastState = null;
    this._lastPresearch = null;
    this._lastBuild = null;
    // Track mtime+size to skip unnecessary reads
    this._lastStatStat = null;
    this._lastPresearchStat = null;
    this._lastBuildStat = null;
  }

  start() {
    this._timer = setInterval(() => this._poll(), this.interval);
    this._poll(); // immediate first check
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _poll() {
    this._pollFile('state.json', '_lastStatStat', '_lastState', '_onStateChange');
    this._pollFile('presearch-state.json', '_lastPresearchStat', '_lastPresearch', '_onPresearchChange');
    this._pollFile('build-state.json', '_lastBuildStat', '_lastBuild', '_onBuildChange');
  }

  _pollFile(filename, statKey, cacheKey, handlerName) {
    const filePath = path.join(this.forgeDir, filename);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return; // file doesn't exist yet
    }

    const statFingerprint = `${stat.mtimeMs}:${stat.size}`;
    if (this[statKey] === statFingerprint) return; // unchanged
    this[statKey] = statFingerprint;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return; // partial write or invalid JSON, retry next poll
    }

    const prev = this[cacheKey];
    this[cacheKey] = data;
    this[handlerName](prev, data);
  }

  _onStateChange(prev, next) {
    if (prev?.mode !== next.mode) {
      this.bus.emit('forge:mode-change', { mode: next.mode });
    }
    if (prev?.status !== next.status) {
      this.bus.emit('forge:status-change', { status: next.status });
    }
    if (prev?.presearch?.currentLoop !== next.presearch?.currentLoop) {
      this.bus.emit('forge:loop-change', {
        loop: next.presearch.currentLoop,
        name: next.presearch.currentLoopName,
      });
    }
    if (!prev?.presearch?.waitingForInput && next.presearch?.waitingForInput) {
      this.bus.emit('forge:waiting-for-input', {
        requestId: next.presearch.inputRequestId,
      });
    }
    if (prev?.build?.currentPhase !== next.build?.currentPhase && next.build?.currentPhase) {
      this.bus.emit('forge:phase-change', {
        phase: next.build.currentPhase,
        completedPhases: next.build.completedPhases,
      });
    }
    this.bus.emit('forge:state-update', next);
  }

  _onPresearchChange(prev, next) {
    this.bus.emit('forge:presearch-update', next);
  }

  _onBuildChange(prev, next) {
    this.bus.emit('forge:build-update', next);
  }
}
```

### 3.2 Refactored `ClaudeRunner` (src/bridge/claude-runner.js)

Key changes:
- **Remove** `FORGE_PROTOCOL_RULES` constant (marker instructions)
- **Remove** `respond()` method (no more --resume turn-taking)
- **Remove** `_onText` callback (no more piping text to StageParser)
- **Add** `_installForgeDir(projectDir)` — creates `.forge/`, adds to `.gitignore`
- **Add** `_installGateHook(projectDir)` — writes gate-check.js + settings.local.json hook config
- **Add** `_installForgeProtocol(projectDir, runMode)` — writes disk-state rules file
- **Add** `writeUserInput(requestId, answer)` — interactive mode input
- **Add** `_startWatcher()` — creates and starts ForgeStateWatcher
- **Keep** JSONL parsing for `claude:tool-use`, `claude:tool-result`, `claude:cost`, `claude:exit`
- **Keep** `claude:text` emission (still used for build log raw output)

```javascript
class ClaudeRunner {
  constructor(bus) {
    this.bus = bus;
    this._child = null;
    this._projectDir = null;
    this._installedPaths = []; // all files we installed, for cleanup
    this._watcher = null;
    this.sessionId = null;
  }

  spawn(config) {
    const { projectDir, prompt, runMode = 'autonomous' } = config;
    this._projectDir = projectDir;

    this._installForgeDir(projectDir);
    this._installForgeProtocol(projectDir, runMode);
    this._installGateHook(projectDir);

    const modePrefix = runMode === 'autonomous'
      ? 'Run in AUTONOMOUS mode. Make all presearch decisions yourself using best judgment. Do not wait for user input.'
      : 'Run in INTERACTIVE mode. For each presearch question, set waitingForInput=true and wait for user-input.json.';

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

  writeUserInput(requestId, answer) {
    const inputPath = path.join(this._projectDir, '.forge', 'user-input.json');
    fs.writeFileSync(inputPath, JSON.stringify({
      version: 1,
      requestId,
      answer,
      answeredAt: new Date().toISOString(),
    }, null, 2), 'utf-8');
  }

  kill() {
    if (this._watcher) { this._watcher.stop(); this._watcher = null; }
    this._cleanup();
    if (this._child) { this._child.kill(); this._child = null; }
  }

  _installForgeDir(projectDir) {
    const forgeDir = path.join(projectDir, '.forge');
    fs.mkdirSync(forgeDir, { recursive: true });

    // Add .forge/ to .gitignore if not already there
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

  _installGateHook(projectDir) {
    // Write gate-check script into .forge/
    const hookScript = GATE_CHECK_SCRIPT; // constant defined in module
    const hookPath = path.join(projectDir, '.forge', 'gate-check.js');
    fs.writeFileSync(hookPath, hookScript, 'utf-8');

    // Write/merge hook config into .claude/settings.local.json
    const settingsPath = path.join(projectDir, '.claude', 'settings.local.json');
    let settings = {};
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch { /* doesn't exist yet */ }

    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

    if (!settings.hooks) settings.hooks = {};
    settings.hooks.Stop = [
      {
        hooks: [
          { type: 'command', command: 'node .forge/gate-check.js' }
        ]
      }
    ];

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    this._installedPaths.push(hookPath);
    // Note: don't delete settings.local.json on cleanup — just remove our hook entry
  }

  _installForgeProtocol(projectDir, runMode) {
    const rules = buildForgeProtocolRules(runMode);

    // Install to both global and project rules dirs
    const globalPath = path.join(os.homedir(), '.claude', 'rules', 'forge-protocol.md');
    const localPath = path.join(projectDir, '.claude', 'rules', 'forge-protocol.md');

    for (const p of [globalPath, localPath]) {
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, rules, 'utf-8');
        this._installedPaths.push(p);
      } catch { /* non-critical for global */ }
    }
  }

  _startWatcher() {
    const forgeDir = path.join(this._projectDir, '.forge');
    this._watcher = new ForgeStateWatcher(this.bus, forgeDir, 500);
    this._watcher.start();
  }

  _cleanup() {
    // Remove installed files
    for (const p of this._installedPaths) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
    this._installedPaths = [];

    // Remove our Stop hook from settings.local.json (don't delete the file)
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

  // _buildArgs, _buildEnv, _wireChild, _handleEvent,
  // _handleAssistantMessage, _handleUserMessage — mostly unchanged
  // except _handleAssistantMessage no longer calls _onText
}
```

### 3.3 Events the Runner Still Emits via JSONL

Unchanged from stream-json:
- `claude:session` — session init with session_id
- `claude:text` — assistant text (forwarded as raw output for build log only)
- `claude:tool-use` — tool calls (powers ToolActivityFeed)
- `claude:tool-result` — tool results (powers ToolActivityFeed)
- `claude:cost` — cost tracking
- `claude:turn-end` — turn completion
- `claude:error` — stderr
- `claude:exit` — process exit

---

## 4. Forge Protocol Rules

### 4.1 Rules Content

The `buildForgeProtocolRules(runMode)` function generates the rules markdown.

```markdown
# Forge Protocol — Disk State

You are running inside Claw'd Forge, a visual dashboard for the Claude workflow skill.
Your text output is NOT displayed directly to the user. The dashboard reads `.forge/` JSON files for all UI state.

## CRITICAL: You MUST write these files

A Stop hook validates `.forge/` files after every turn. Your turn WILL BE BLOCKED if files are missing or invalid.

### `.forge/state.json` — Master State (REQUIRED every turn)

Write this file at the START of your work and UPDATE it whenever mode, status, loop, or phase changes.
Always include `updatedAt` with the current ISO timestamp.

Required fields:
- version: 1
- mode: "presearch" | "build" | "complete" | "error"
- status: "running" | "waiting_for_input" | "complete" | "error"
- runMode: "autonomous" | "interactive"
- sessionId: your session ID
- projectName: target project directory name
- startedAt: ISO timestamp (first write only)
- updatedAt: ISO timestamp (every write)
- presearch: { status, currentLoop (1-5), currentLoopName, completedLoops[], totalLoops: 5, waitingForInput: bool, inputRequestId: string|null }
- build: { status, phases[], currentPhase, completedPhases[], tasksTotal, tasksCompleted, activeAgents, blockers[] }
- cost: { totalUsd, turns }
- error: string|null

### `.forge/presearch-state.json` — Presearch Questions & Decisions (REQUIRED during presearch)

Write and update during presearch. Contains:
- requirements[]: { id, text, source, category, priority }
- questions[]: { id, loop, loopName, type ("choice"|"text"), question, options[], status ("pending"|"answered"|"skipped"), answer, answeredAt }
- decisions[]: { id, loop, summary, questionId, decidedAt }

Each option: { name, pros[], cons[], bestWhen, recommended: bool }

### `.forge/build-state.json` — Build Progress (REQUIRED during build)

Write and update during build. Contains:
- phases[]: { name, status ("pending"|"in_progress"|"complete"), tasks[] }
- Each task: { id, description, status ("pending"|"running"|"complete"|"failed"), commit, completedAt }
- agents: { active, totalSpawned, totalCompleted }
- summary: null until complete, then { tests, phases, commits, totalTasks }

## Writing Rules

- Use the Write tool for all `.forge/` file writes
- Write COMPLETE valid JSON every time (not partial updates)
- Always update `updatedAt` in state.json on every write
- Do NOT emit [FORGE:*] markers in text output — they are deprecated

## [AUTONOMOUS|INTERACTIVE] Mode Rules

[Content varies by runMode — see section 4.2]
```

### 4.2 Mode-Specific Rules

**Autonomous mode suffix:**
```markdown
## Autonomous Mode

- Ask 3-5 questions per presearch loop AND answer them yourself with your best recommendation
- Set ALL question statuses to "answered" with your chosen answer
- Do NOT set waitingForInput to true
- Proceed through all 5 loops without pausing
- After presearch is complete, transition mode to "build" and begin building
```

**Interactive mode suffix:**
```markdown
## Interactive Mode

- Ask 3-5 questions per presearch loop
- For EACH question batch:
  1. Write questions to presearch-state.json with status "pending"
  2. Set state.json: status="waiting_for_input", presearch.waitingForInput=true, presearch.inputRequestId=<first pending question id>
  3. STOP your turn (the Stop hook will block you until the user answers)
  4. When unblocked, read .forge/user-input.json for the answer
  5. Update the question status to "answered", clear waitingForInput, continue

The Stop hook checks: if waitingForInput=true and user-input.json doesn't have a matching requestId, your turn is blocked. When the user answers via the dashboard, user-input.json is written and your next stop attempt will succeed. Then start a new turn to continue.
```

---

## 5. Presearch Flow — Autonomous Mode

End-to-end sequence:

1. User clicks "Start Build" on LaunchScreen with mode set to "Autonomous"
2. `App.jsx` calls `forgeAPI.spawnClaude({ projectDir, prompt, runMode: 'autonomous' })`
3. `main.js` IPC creates ClaudeRunner, calls `runner.spawn(config)`
4. Runner installs: `.forge/` dir, `gate-check.js`, forge-protocol.md rules, settings.local.json hook
5. Runner spawns: `claude -p "<autonomous prefix + prompt>" --output-format stream-json --verbose --dangerously-skip-permissions`
6. Runner starts ForgeStateWatcher polling `.forge/` every 500ms
7. Claude reads PRD, starts presearch loop 1
8. Claude writes `.forge/state.json` (mode=presearch, loop=1) and `.forge/presearch-state.json` (requirements + questions with answers)
9. Watcher detects files → emits `forge:state-update`, `forge:presearch-update`
10. main.js forwards via IPC → renderer receives state
11. PresearchWizard renders answered questions as read-only DecisionCards
12. Claude progresses through loops 2-5, updating files each time
13. Claude finishes presearch, writes `state.json` with mode=build
14. Watcher emits `forge:mode-change` → App.jsx switches to BuildDashboard
15. Claude builds the project, writing task/phase progress to `build-state.json`
16. On completion: `state.json` mode=complete → CompletionScreen renders

**No `--resume`. No markers. One `claude -p` call runs the entire session.**

---

## 6. Presearch Flow — Interactive Mode

Built on top of autonomous with Stop hook pausing:

1. Steps 1-6 same as autonomous, but `runMode: 'interactive'`
2. Claude starts presearch, writes questions with `status: "pending"`
3. Claude sets `state.json` `waitingForInput: true`, `inputRequestId: "q1"`
4. Claude's turn ends naturally (it wrote the files and has nothing more to do)
5. Stop hook fires → checks: waitingForInput=true, no matching user-input.json → **exit 2 blocks stop**
6. Claude receives feedback: "User has not answered question q1 yet"
7. Claude retries stopping (it has nothing else to do) → blocked again
8. **Meanwhile:** Watcher detects `waitingForInput: true` → emits `forge:waiting-for-input`
9. PresearchWizard renders pending question as interactive QuestionCard
10. User selects an option → dashboard calls `forgeAPI.sendForgeResponse('select-option', { requestId: 'q1', answer: 'SQLite' })`
11. main.js calls `runner.writeUserInput('q1', 'SQLite')` → writes `.forge/user-input.json`
12. Stop hook fires → checks: user-input.json has matching requestId → **exit 0 allows stop**
13. Claude's turn ends successfully
14. **New turn needed:** The runner needs to send a follow-up to continue. Options:
    a. Use `--resume` with a simple prompt: "Continue presearch. Read .forge/user-input.json for the user's answer."
    b. OR: The Stop hook feedback already told Claude the answer is ready — Claude reads it before the turn actually ends

**RISK: Interactive mode may still need `--resume` for the continuation step.** But it's much more reliable because:
- Each resume is short (just "continue, answer is in the file")
- State is on disk, not in the conversation
- If resume freezes, the dashboard still shows last known state

**Fallback if resume is unreliable:** Use a fresh `-p` call with `--resume` session ID. If even that fails, consider making interactive mode spawn a new `-p` for each loop, passing the full presearch-state.json as context.

---

## 7. Build Flow

1. Claude writes `state.json` with `mode: "build"` and `build-state.json` with phase list
2. Watcher emits `forge:mode-change` + `forge:build-update`
3. BuildDashboard renders PhaseStepper from `buildState.phases`
4. As Claude works, it updates `build-state.json`:
   - Task added with `status: "running"` → CardLog shows running task
   - Task completed with `commit` message → CardLog shows completed task
   - Agent counts updated → stats badge
   - Phase completed → PhaseStepper advances
5. Blockers: Claude writes to `state.json` `build.blockers[]` → BlockerCard renders
   - User resolves → dashboard writes `user-input.json` with blocker requestId
   - Claude reads resolution, marks blocker resolved
6. Completion: Claude writes `build-state.json` summary + `state.json` mode=complete
7. CompletionScreen renders with summary data

**ToolActivityFeed stays as-is** — powered by `claude:tool-use` stream-json events, completely independent of disk state.

**Build log stays as-is** — powered by `claude:text` events forwarded as `forge:raw-output`.

---

## 8. Dashboard Polling & IPC

### 8.1 Event Flow

```
ForgeStateWatcher (main process)
  │ polls .forge/*.json every 500ms
  │ diffs against cached state
  │ emits on ForgeBus:
  ├── forge:state-update (full state.json)
  ├── forge:presearch-update (full presearch-state.json)
  ├── forge:build-update (full build-state.json)
  ├── forge:mode-change ({ mode })
  ├── forge:status-change ({ status })
  ├── forge:loop-change ({ loop, name })
  ├── forge:phase-change ({ phase, completedPhases })
  └── forge:waiting-for-input ({ requestId })
       │
main.js listens on ForgeBus, forwards via IPC:
  mainWindow.webContents.send(eventName, payload)
       │
preload.js exposes new listeners:
  window.forgeAPI.onStateUpdate(cb)
  window.forgeAPI.onPresearchUpdate(cb)
  window.forgeAPI.onBuildUpdate(cb)
  window.forgeAPI.onModeChange(cb)
  window.forgeAPI.onWaitingForInput(cb)
```

### 8.2 Preload Changes

Add new IPC channels, keep existing tool/cost channels:

```javascript
// NEW — disk state channels
onStateUpdate: (cb) => ipcRenderer.on('forge:state-update', (_e, d) => cb(d)),
onPresearchUpdate: (cb) => ipcRenderer.on('forge:presearch-update', (_e, d) => cb(d)),
onBuildUpdate: (cb) => ipcRenderer.on('forge:build-update', (_e, d) => cb(d)),
onModeChange: (cb) => ipcRenderer.on('forge:mode-change', (_e, d) => cb(d)),
onWaitingForInput: (cb) => ipcRenderer.on('forge:waiting-for-input', (_e, d) => cb(d)),

// CHANGED — sendForgeResponse now writes user-input.json instead of --resume
sendForgeResponse: (action, payload) => ipcRenderer.send('forge:respond', { action, payload }),

// KEEP — these are stream-json powered, not marker-based
onToolUse, onToolResult, onSession, onCost, onTurnEnd, onClaudeExit, onRawOutput,
selectDirectory, scanForPRD, spawnClaude, loadForgeLog,

// REMOVE in Phase 4
// onForgeEvent (replaced by granular state channels)
```

### 8.3 Listener Cleanup

**Bug fix needed:** Current preload uses `ipcRenderer.on()` which stacks listeners on re-render. Add cleanup:

```javascript
// In main.js, on new claude:spawn, remove old listeners before adding new ones
// OR use a single persistent listener that dispatches to current handler
```

### 8.4 New Hook: `useForgeState`

```javascript
// src/hooks/useForgeState.js
import { useState, useEffect } from 'preact/hooks';

export function useForgeState() {
  const [state, setState] = useState(null);
  const [presearch, setPresearch] = useState(null);
  const [build, setBuild] = useState(null);

  useEffect(() => {
    if (!window.forgeAPI) return;
    const unsubs = [];

    if (window.forgeAPI.onStateUpdate) {
      window.forgeAPI.onStateUpdate(setState);
    }
    if (window.forgeAPI.onPresearchUpdate) {
      window.forgeAPI.onPresearchUpdate(setPresearch);
    }
    if (window.forgeAPI.onBuildUpdate) {
      window.forgeAPI.onBuildUpdate(setBuild);
    }

    return () => { /* cleanup listeners */ };
  }, []);

  return { state, presearch, build };
}
```

---

## 9. Component Changes

### 9.1 No Changes Needed

| Component | Why |
|-----------|-----|
| `ToolActivityFeed.jsx` | Already reads `claude:tool-use` events, not markers |
| `ClawdStage.jsx` + canvas modules | Just costume API — event names change in App.jsx |
| `HeaderBar.jsx` | Receives props, doesn't listen to events directly |
| `LoadingStatus.jsx` | Pure display |
| `CompletionScreen.jsx` | Pure display, receives summary prop |
| `PauseScreen.jsx` | Pure display |
| `Badge.jsx`, `Button.jsx`, `Card.jsx` | Shared primitives |
| `QuestionCard.jsx` | Already takes `{ id, question, options, onSelect }` — matches schema |
| `DecisionCard.jsx` | Already takes `{ summary, onReopen }` |
| `TextCard.jsx` | Already takes `{ id, question, onSubmit }` |
| `TaskCard.jsx` | Already takes `{ title, commit, timestamp }` |
| `BlockerCard.jsx` | Already takes `{ title, description, onSkipMock }` |
| `CardLog.jsx` | Container, no data awareness |

### 9.2 Components That Change Data Source

**`App.jsx`** — Major refactor:
- Replace `useEffect` with `forge:event` listener → use `useForgeState()` hook
- Mode transitions from `state.mode` instead of `forge:mode` events
- Claw'd costumes from `state.presearch.currentLoopName` / `state.build.currentPhase`
- Pass `runMode` from LaunchScreen through to `spawnClaude`
- Pass `state`, `presearch`, `build` as props to child components

**`PresearchWizard.jsx`** — Major rewrite:
- Replace all `forge:event` handling with props from `useForgeState`
- Derive cards from `presearch.questions[]` array:
  - `status: "answered"` → render as DecisionCard
  - `status: "pending"` + interactive mode → render as QuestionCard
  - `status: "pending"` + autonomous mode → render as loading
- Loop/stepper from `state.presearch.currentLoop` / `state.presearch.completedLoops`
- Requirements from `presearch.requirements[]`
- Remove: `pendingQuestion` ref, `pendingOptions` ref, `seenQuestions` ref, event switch statement
- Keep: `handleSelect`, `handleTextSubmit` (but they call `writeUserInput` via new IPC)

**`BuildDashboard.jsx`** — Major rewrite:
- Replace `forge:event` handling with props from `useForgeState`
- Phases from `build.phases[]`
- Cards derived from `build.phases[].tasks[]`
- Stats from `build.agents` + state
- Blockers from `state.build.blockers[]`
- Completion from `state.mode === 'complete'` + `build.summary`
- Keep: ToolActivityFeed (unchanged), build log from `claude:text` raw output

**`LaunchScreen.jsx`** — Moderate changes:
- Add mode toggle: "Autonomous" (default) / "Interactive"
- Pass `runMode` through `onLaunch` config
- New state: `const [runMode, setRunMode] = useState('autonomous')`

**`PresearchStepper.jsx`** — Minor changes:
- Props may change slightly: receive loop data from state object instead of individual fields

**`PhaseStepper.jsx`** — Minor changes:
- Props from `build.phases[]` instead of separate arrays

### 9.3 New Components

**`ModeToggle.jsx`** — Simple autonomous/interactive toggle for LaunchScreen

### 9.4 Components to Remove (Phase 4)

- `DiagnosticFeed.jsx` — debug component, replaced by structured state
- `AccordionCard.jsx` — unused with new flat question rendering
- `RequirementsPanel.jsx` — keep if still useful, but data source changes

---

## 10. Event Bus Changes

### 10.1 New Events (from ForgeStateWatcher)

```javascript
const FORGE_STATE_EVENTS = [
  'forge:state-update',       // full state.json on every change
  'forge:presearch-update',   // full presearch-state.json
  'forge:build-update',       // full build-state.json
  'forge:mode-change',        // { mode }
  'forge:status-change',      // { status }
  'forge:loop-change',        // { loop, name }
  'forge:phase-change',       // { phase, completedPhases }
  'forge:waiting-for-input',  // { requestId }
];
```

### 10.2 Events Removed (Phase 4)

All marker-based forge events:
```javascript
// REMOVE — formerly from StageParser
'forge:question', 'forge:option', 'forge:option-end',
'forge:text-question', 'forge:accordion', 'forge:accordion-section',
'forge:registry', 'forge:decision', 'forge:loop',
'forge:mode', 'forge:phase', 'forge:task',
'forge:blocker', 'forge:context-warning', 'forge:complete',
'forge:agent-spawn', 'forge:agent-done',

// REMOVE — v1 regex patterns
'mode:change', 'stage:change', 'agent:spawn', 'agent:done',
'decision:lock', 'artifact:create', 'warning',
```

### 10.3 Events Unchanged

All `claude:*` stream-json events remain as-is.

---

## 11. main.js IPC Changes

### 11.1 `claude:spawn` Handler Refactor

```javascript
ipcMain.on('claude:spawn', (_event, config) => {
  const { projectDir, prompt, prdFile, runMode } = config;

  if (runner) runner.kill();
  runner = new ClaudeRunner(bus);

  runner.spawn({ projectDir, prompt: prompt || 'Run the /workflow skill', runMode });

  // Forward raw text for build log (keep this)
  bus.on('claude:text', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('forge:raw-output', data.text);
    }
  });

  // NO LONGER: wire text to StageParser
  // NO LONGER: initialize ForgeLog (replaced by .forge/ state files)
  // NO LONGER: wire forge:decision/task/phase/mode to ForgeLog
});
```

### 11.2 New Event Forwarding

```javascript
// Forward disk-state events to renderer
const FORGE_STATE_EVENTS = [
  'forge:state-update', 'forge:presearch-update', 'forge:build-update',
  'forge:mode-change', 'forge:status-change', 'forge:loop-change',
  'forge:phase-change', 'forge:waiting-for-input',
];

for (const event of FORGE_STATE_EVENTS) {
  bus.on(event, (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, payload);
    }
  });
}
```

### 11.3 `forge:respond` Handler Refactor

```javascript
ipcMain.on('forge:respond', (_event, { action, payload }) => {
  if (!runner) return;

  // Interactive mode: write answer to disk instead of --resume
  if (payload.requestId) {
    runner.writeUserInput(payload.requestId, payload.answer || payload.name || payload.text);
  }
});
```

---

## 12. ForgeLog Migration

`ForgeLog` (`src/bridge/forge-log.js`) currently writes `forge-log.json` in the project root. This is superseded by `.forge/state.json` + `.forge/presearch-state.json`.

**Phase 1:** Keep ForgeLog alongside new system (parallel operation)
**Phase 4:** Remove ForgeLog entirely. If resume functionality is needed, derive it from `.forge/state.json` existence check instead of `forge-log.json`.

The `forge:load-log` IPC handler changes to check for `.forge/state.json`:
```javascript
ipcMain.handle('forge:load-log', async (_event, projectDir) => {
  const statePath = path.join(projectDir, '.forge', 'state.json');
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return null;
  }
});
```

---

## 13. Migration Phases

### Phase 0: Prototype & Validate (CRITICAL — do this first)

**Goal:** Prove that Claude writes `.forge/` files when instructed, and the Stop hook blocks correctly.

Tasks:
1. Write `ForgeStateWatcher` class + unit tests
2. Write `gate-check.js` + unit tests
3. Manual Claude compliance test:
   - Create a test project dir
   - Write forge-protocol.md rules to `.claude/rules/`
   - Write Stop hook to `.claude/settings.local.json`
   - Run: `claude -p "Create a simple state.json file in .forge/ with mode=presearch, status=running, and a valid updatedAt timestamp. Also create .forge/presearch-state.json with an empty questions array." --output-format stream-json --dangerously-skip-permissions`
   - Verify: `.forge/state.json` and `.forge/presearch-state.json` exist and are valid
   - Verify: gate-check.js passes (exit 0)

**If Claude doesn't comply:** Adjust rules, add more explicit examples, try `agent` type hook instead of `command`.

### Phase 1: Parallel Architecture

**Goal:** Add new modules alongside old ones. Both event paths active. All tests green.

Tasks:
1. Add `ForgeStateWatcher` to `src/bridge/`
2. Refactor `ClaudeRunner`: add `_installForgeDir`, `_installGateHook`, `_installForgeProtocol`, `writeUserInput`, `_startWatcher`
3. Keep old marker path active (StageParser still runs)
4. Add new IPC channels to `preload.js` and `main.js`
5. Add `useForgeState` hook
6. Update event-bus.js with new event types

### Phase 2: Dashboard — Autonomous Mode

**Goal:** PresearchWizard and BuildDashboard read from disk state. Autonomous mode works end-to-end.

Tasks:
1. Add `ModeToggle` to `LaunchScreen`
2. Rewrite `PresearchWizard` to derive cards from `presearch.questions[]`
3. Rewrite `BuildDashboard` to derive cards from `build.phases[].tasks[]`
4. Refactor `App.jsx` to use `useForgeState` for mode transitions + costume changes
5. Update `preload.js` `sendForgeResponse` to use `writeUserInput`
6. Update component tests

### Phase 3: Interactive Mode

**Goal:** Users can answer presearch questions mid-flow.

Tasks:
1. Implement interactive gate-check extension (block while waitingForInput)
2. Add interactive mode rules to forge protocol
3. PresearchWizard handles `state.status === 'waiting_for_input'`
4. Wire user responses to `writeUserInput`
5. Test: does the Stop hook correctly block/unblock?
6. Test: does Claude correctly resume after user answers?
7. If `--resume` is needed for continuation: implement minimal resume logic

### Phase 4: Cleanup

**Goal:** Remove all legacy code paths.

Tasks:
1. Remove `StageParser` class + `patterns.json`
2. Remove `FORGE_PROTOCOL_RULES` constant
3. Remove `ForgeLog` class
4. Remove old `forge:*` event handling from `main.js`
5. Remove `onForgeEvent` from `preload.js`
6. Remove `useForgeEvents` hook
7. Update `event-bus.js`: remove `FORGE_EVENTS_V2`, add `FORGE_STATE_EVENTS`
8. Remove `DiagnosticFeed` component (or keep for debug)
9. Remove `stdin-translator.js` (no longer translating actions to natural language)
10. Update all affected tests
11. Run full test suite, lint, verify clean

---

## 14. Risk Analysis

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude doesn't write `.forge/` files reliably | Dashboard shows nothing | Stop hook forces compliance; prototype in Phase 0 |
| Interactive Stop hook blocks cause Claude to burn tokens retrying | High cost, slow UX | Add delay in hook; consider `--resume` fallback |
| Settings.local.json merge conflicts with existing config | Hook doesn't install | Read-merge-write, use local scope |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Partial JSON writes (Claude mid-write when polled) | Parse errors in watcher | Catch JSON parse errors, retry next poll |
| Claude writes wrong schema (missing fields) | Dashboard renders incorrectly | Gate check validates schema; add examples in rules |
| Interactive mode still needs `--resume` | Back to freeze risk | Resume only carries "continue" not full state |
| Component test rewrites break coverage | Regressions | Phase 1 keeps both paths; tests updated incrementally |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| 500ms poll too slow/fast | UX lag or CPU waste | Configurable interval |
| `.forge/` in `.gitignore` conflicts | User confusion | Check before appending |
| Token cost increase from file writes | Higher cost | Monitor in Phase 2; overhead should be small |

### Unknowns Requiring Phase 0 Validation

1. Does Claude comply with disk-state rules when instructed via `.claude/rules/`?
2. Does the Stop hook `exit 2` correctly block turns on Windows?
3. Does Claude handle the "blocked, try again" feedback loop gracefully?
4. What's the token overhead of writing JSON files vs emitting markers?

---

## 15. Testing Strategy

### 15.1 New Unit Tests

| Test File | What It Tests |
|-----------|--------------|
| `test/forge-state-watcher.test.js` | File detection, change diffing, event emission, mtime optimization, cleanup |
| `test/gate-check.test.js` | Validation logic: missing files, invalid schema, mode-specific checks, interactive blocking |

### 15.2 Updated Unit Tests

| Test File | Changes |
|-----------|---------|
| `test/claude-runner.test.js` | Add: installForgeDir, installGateHook, writeUserInput, startWatcher. Remove: respond() tests |
| `test/stdin-translator.test.js` | Deprecate or remove (Phase 4) |
| `test/forge-log.test.js` | Deprecate or remove (Phase 4) |
| `test/stage-parser.test.js` | Deprecate or remove (Phase 4) |
| `test/event-bus.test.js` | Update event lists |

### 15.3 Updated Component Tests

| Test File | Changes |
|-----------|---------|
| `test/components/App.test.jsx` | Mode transitions from useForgeState, costume mapping from state |
| `test/components/PresearchWizard.test.jsx` | Rewrite: pass presearch state as props, test autonomous/interactive rendering |
| `test/components/BuildDashboard.test.jsx` | Rewrite: pass build state as props, test phase/task rendering |
| `test/components/LaunchScreen.test.jsx` | Add: mode toggle tests |

### 15.4 New Integration Test

| Test File | What It Tests |
|-----------|--------------|
| `test/integration/disk-state-flow.test.js` | Full flow simulation: write .forge/ files progressively, verify watcher events, verify component state derivation |

### 15.5 Manual Testing Checklist

- [ ] Claude writes valid `.forge/state.json` when instructed
- [ ] Gate check blocks on missing files (exit 2)
- [ ] Gate check passes on valid files (exit 0)
- [ ] Autonomous presearch: questions appear as answered DecisionCards
- [ ] Build phase: tasks appear in CardLog from build-state.json
- [ ] ToolActivityFeed still works (stream-json, independent of disk state)
- [ ] Interactive presearch: pending question renders, user can answer
- [ ] Mode toggle works on LaunchScreen
- [ ] Completion summary renders from build-state.json
- [ ] Cleanup on kill: hook removed, rules removed

---

## 16. Files Created / Modified / Removed

### Created
- `src/bridge/forge-state-watcher.js` — new file watcher module
- `test/forge-state-watcher.test.js` — watcher tests
- `test/gate-check.test.js` — hook validation tests
- `src/hooks/useForgeState.js` — new state hook
- `src/components/ModeToggle.jsx` — autonomous/interactive toggle
- `test/integration/disk-state-flow.test.js` — integration test

### Modified (Major)
- `src/bridge/claude-runner.js` — full refactor
- `src/bridge/event-bus.js` — new event types
- `src/App.jsx` — useForgeState, mode transitions
- `src/components/presearch/PresearchWizard.jsx` — rewrite data source
- `src/components/build/BuildDashboard.jsx` — rewrite data source
- `src/components/LaunchScreen.jsx` — add mode toggle
- `main.js` — new IPC handlers, event forwarding
- `preload.js` — new channels

### Modified (Minor)
- `src/components/presearch/PresearchStepper.jsx` — prop shape
- `src/components/build/PhaseStepper.jsx` — prop shape

### Removed (Phase 4)
- `src/bridge/stage-parser.js`
- `src/bridge/patterns.json`
- `src/bridge/forge-log.js`
- `src/bridge/stdin-translator.js`
- `src/hooks/useForgeEvents.js`
- `src/components/presearch/DiagnosticFeed.jsx` (optional)
- `test/stage-parser.test.js`
- `test/forge-log.test.js`
- `test/stdin-translator.test.js`

### Unchanged
- All canvas/clawd modules
- `ToolActivityFeed.jsx`
- `HeaderBar.jsx`, `LoadingStatus.jsx`
- `CompletionScreen.jsx`, `PauseScreen.jsx`
- `QuestionCard.jsx`, `DecisionCard.jsx`, `TextCard.jsx`
- `TaskCard.jsx`, `BlockerCard.jsx`, `ContextCard.jsx`
- `CardLog.jsx`
- All shared components (Badge, Button, Card)
- `jsonl-parser.js` + tests
