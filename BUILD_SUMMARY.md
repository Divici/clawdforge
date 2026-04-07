# Claw'd Forge — Complete Build Summary

> Everything needed to understand, rebuild, or extend Claw'd Forge from scratch.

---

## Table of Contents

1. [What It Is](#what-it-is)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Electron Main Process](#electron-main-process)
6. [Preload & IPC Bridge](#preload--ipc-bridge)
7. [Vite Configuration](#vite-configuration)
8. [Bridge Layer (Main Process Modules)](#bridge-layer-main-process-modules)
9. [Dashboard UI (Preact Renderer)](#dashboard-ui-preact-renderer)
10. [Claw'd Mascot System (Canvas)](#clawd-mascot-system-canvas)
11. [Hooks (Preact)](#hooks-preact)
12. [Styles & Design Tokens](#styles--design-tokens)
13. [Disk-State Architecture](#disk-state-architecture)
14. [Testing](#testing)
15. [Claude Code Configuration](#claude-code-configuration)
16. [Custom Skills (Full Contents)](#custom-skills-full-contents)
17. [Safety Hooks](#safety-hooks)
18. [Memory Bank System](#memory-bank-system)
19. [Decision Records](#decision-records)
20. [Build & Development Commands](#build--development-commands)
21. [Build Phases (How It Was Built)](#build-phases-how-it-was-built)
22. [Known Issues & Limitations](#known-issues--limitations)
23. [Final Metrics](#final-metrics)

---

## What It Is

Claw'd Forge is an **Electron desktop application** that wraps the Claude CLI `workflow` skill in a visual dashboard. Instead of watching terminal output scroll by, users see:

- **Interactive presearch wizard** — answer architecture questions via clickable cards
- **Build progress dashboard** — phase stepper, task cards, blocker alerts
- **Animated mascot** — an orange lobster named Claw'd that changes costumes based on workflow phase

The terminal is completely hidden. Claude runs as a headless child process; the dashboard reads structured state from disk and renders it as a UI.

**Problem solved:** Claude's workflow skill produces dense terminal output that's hard to scan. Claw'd Forge makes the same workflow visual, interactive, and fun.

**Target users:** Individual developers using Claude's workflow skill for project building.

---

## Architecture Overview

```
+----------------------------------------------------------+
|                    Electron Shell                         |
|                                                          |
|  +-------------------+     IPC      +------------------+ |
|  |   Main Process    | <==========> |    Renderer      | |
|  |                   |              |                  | |
|  |  claude-runner.js |              |  App.jsx (Preact)| |
|  |  event-bus.js     |              |  Components/     | |
|  |  forge-state-     |              |  Hooks/          | |
|  |   watcher.js      |              |  Styles/         | |
|  |  jsonl-parser.js  |              |                  | |
|  |  gate-check.js    |              |  ClawdStage.jsx  | |
|  +--------+----------+              |  (Canvas 30fps)  | |
|           |                         +------------------+ |
|           | spawns                                       |
|  +--------v----------+                                   |
|  |   Claude CLI       |                                  |
|  |  (child process)   |                                  |
|  |  stream-json stdout|                                  |
|  |  .forge/ disk state|                                  |
|  +--------------------+                                  |
+----------------------------------------------------------+
```

**Data flow:**
1. User selects project directory + PRD in Launch Screen
2. Electron spawns Claude CLI as child process with `--output-format stream-json`
3. Claude writes structured JSON to `.forge/` directory
4. ForgeStateWatcher polls `.forge/` every 500ms, detects changes
5. Events forwarded to renderer via Electron IPC
6. Preact components re-render based on state updates
7. Canvas renders Claw'd mascot at 30fps with costume matching current phase
8. User interactions (presearch answers) write to `.forge/user-input.json`, Claude reads them

---

## Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Desktop Shell | Electron | ^30.5.1 | Spawns child processes, native dialogs, IPC |
| UI Framework | Preact | ^10.25.0 | 3kb React alternative with full compat layer |
| Bundler | Vite | ^6.0.0 | Fast HMR, JSX via @preact/preset-vite |
| Canvas | Vanilla JS | N/A | 30fps render loop, pixel-perfect control, no library overhead |
| Testing | Vitest + @testing-library/preact | ^4.1.0 / ^3.2.4 | Same bundler as prod, component testing, JSDOM |
| CSS | Vanilla CSS + Custom Properties | N/A | Design tokens, no CSS-in-JS build cost |
| Linting | ESLint | ^9.0.0 | Flat config format |
| Packaging | electron-builder | ^26.8.1 | Produces .exe installer |
| Dev Reload | electron-reload | ^2.0.0-alpha.1 | HMR during Electron development |
| DOM Testing | jsdom | ^25.0.0 | Test environment for Vitest |

### Dependencies (package.json)

```json
{
  "name": "clawd-forge",
  "version": "2.0.0",
  "main": "main.js",
  "scripts": {
    "start": "node launch.js",
    "dev": "vite",
    "dev:build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "quality": "npm run lint && npm run test",
    "build": "vite build && electron-builder"
  },
  "dependencies": {
    "electron-reload": "^2.0.0-alpha.1",
    "preact": "^10.25.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@preact/preset-vite": "^2.9.0",
    "@testing-library/preact": "^3.2.4",
    "electron": "^30.5.1",
    "electron-builder": "^26.8.1",
    "eslint": "^9.0.0",
    "jsdom": "^25.0.0",
    "vite": "^6.0.0",
    "vitest": "^4.1.0"
  }
}
```

---

## Directory Structure

```
clawdForge/
├── .claude/                          # Claude Code configuration
│   ├── CLAUDE.md                     # Project dev rules
│   ├── settings.json                 # Permissions & hooks
│   ├── settings.local.json           # Local dev overrides
│   ├── hooks/                        # Safety hooks
│   │   ├── protect-env.sh            # Blocks writes to .env files
│   │   └── block-destructive-git.sh  # Blocks force push, hard reset
│   └── skills/                       # Custom workflow skills
│       ├── commit/SKILL.md
│       ├── code-quality/SKILL.md
│       ├── decision-log/SKILL.md
│       ├── memory-bank/SKILL.md
│       ├── pr/SKILL.md
│       └── tdd-workflow/SKILL.md
├── decisions/                        # Architecture Decision Records
│   └── 0001-project-bootstrap.md
├── memory-bank/                      # Cross-session persistence
│   ├── active-context.md
│   ├── product-context.md
│   ├── progress.md
│   ├── project-brief.md
│   ├── system-patterns.md
│   ├── tech-context.md
│   └── plans/                        # Phase-specific build plans
│       ├── phase-scaffold-detail.md
│       ├── phase-bridge-detail.md
│       └── path-b-disk-state.md
├── src/
│   ├── index.html                    # Vite HTML entry
│   ├── main.jsx                      # Preact mount point
│   ├── App.jsx                       # Root component (mode router)
│   ├── assets/                       # Sprites, fonts
│   │   └── sprites/clawSprite.png
│   ├── bridge/                       # Main process modules (CommonJS)
│   │   ├── claude-runner.js          # Spawns Claude, wires everything
│   │   ├── event-bus.js              # ForgeBus EventEmitter
│   │   ├── forge-state-watcher.js    # Polls .forge/ for changes
│   │   ├── jsonl-parser.js           # Stream JSON Lines parser
│   │   ├── gate-check.js             # Stop hook validator
│   │   └── forge-log.js              # Legacy session log
│   ├── clawd/                        # Canvas mascot system
│   │   ├── ClawdStage.jsx            # Canvas Preact wrapper
│   │   ├── stage-renderer.js         # 30fps render loop
│   │   ├── clawd-mascot.js           # Mascot class (14 costumes)
│   │   └── helpers.js                # Subagent helper sprites
│   ├── components/
│   │   ├── HeaderBar.jsx             # App header with timer
│   │   ├── LaunchScreen.jsx          # Project setup screen
│   │   ├── LoadingStatus.jsx         # Thinking spinner
│   │   ├── presearch/                # Interactive wizard
│   │   │   ├── PresearchWizard.jsx   # Card orchestrator
│   │   │   ├── PresearchStepper.jsx  # 5-step progress
│   │   │   ├── QuestionCard.jsx      # Choice card
│   │   │   ├── TextCard.jsx          # Free-text input
│   │   │   ├── DecisionCard.jsx      # Locked decision
│   │   │   ├── RegistryCard.jsx      # Tech registry
│   │   │   ├── AccordionCard.jsx     # Expandable detail
│   │   │   ├── RequirementsPanel.jsx # Requirements sidebar
│   │   │   └── DiagnosticFeed.jsx    # Debug event stream
│   │   ├── build/                    # Build progress
│   │   │   ├── BuildDashboard.jsx    # Build orchestrator
│   │   │   ├── PhaseStepper.jsx      # Phase roadmap
│   │   │   ├── CardLog.jsx           # Scrollable task history
│   │   │   ├── TaskCard.jsx          # Individual task
│   │   │   ├── BlockerCard.jsx       # Error intervention
│   │   │   ├── FailureCard.jsx       # Fatal error
│   │   │   ├── ContextCard.jsx       # Context window warning
│   │   │   ├── PauseScreen.jsx       # Paused overlay
│   │   │   ├── CompletionScreen.jsx  # Success summary
│   │   │   └── ConfigScreen.jsx      # Post-build config
│   │   └── shared/                   # Reusable atoms
│   │       ├── Card.jsx
│   │       ├── Button.jsx
│   │       ├── Badge.jsx
│   │       └── ProConList.jsx
│   ├── hooks/
│   │   ├── useElapsedTimer.js        # Running clock
│   │   ├── useForgeAPI.js            # IPC bridge access
│   │   └── useForgeState.js          # Disk-state subscription
│   └── styles/
│       ├── theme.css                 # Design tokens
│       ├── global.css                # Layout, reset, scrollbars
│       └── deck.css                  # Legacy v1 styles
├── test/                             # Vitest test suite (mirrors src/)
│   ├── setup.js
│   ├── claude-runner.test.js
│   ├── event-bus.test.js
│   ├── forge-state-watcher.test.js
│   ├── gate-check.test.js
│   ├── jsonl-parser.test.js
│   ├── state-machines.test.js
│   ├── clawd/
│   ├── components/
│   ├── hooks/
│   ├── styles/
│   └── integration/
├── main.js                           # Electron main process entry
├── preload.js                        # Context-isolated IPC bridge
├── launch.js                         # Clears ELECTRON_RUN_AS_NODE
├── vite.config.mjs                   # Vite bundler config
├── vitest.config.mjs                 # Test runner config
├── eslint.config.js                  # ESLint flat config
├── electron-builder.yml              # Packaging config
├── PRESEARCH.md                      # Locked PRD (central authority)
├── WORKFLOW_STATE.md                 # Build progress tracker
├── STUDY_GUIDE.md                    # Developer onboarding
└── FUTURE.md                         # v3 roadmap
```

---

## Electron Main Process

**`main.js`** (~200 lines) — Creates the BrowserWindow and wires all IPC.

Key responsibilities:
- Creates `BrowserWindow` (1400x800, min 900x500)
- Loads `dist-renderer/index.html` (production) or `http://localhost:5173` (dev)
- Registers IPC handlers:
  - `dialog:select-directory` — native file picker dialog
  - `project:scan-prd` — finds PRD/markdown files in selected directory
  - `claude:spawn` — creates ClaudeRunner, spawns Claude CLI process
  - `forge:respond` — writes user input to `.forge/user-input.json`
  - `forge:load-log` — resume detection for interrupted sessions
- Forwards all bridge events to renderer via `mainWindow.webContents.send()`
- Kills Claude process tree on app quit

**`launch.js`** (~16 lines) — Startup script that clears `ELECTRON_RUN_AS_NODE` (set by VS Code/Claude Code, which breaks Electron's GUI mode) and spawns Electron with inherited stdio.

---

## Preload & IPC Bridge

**`preload.js`** (~47 lines) — Context isolation bridge exposing `window.forgeAPI`:

```javascript
// Exposed methods (renderer can call these):
window.forgeAPI = {
  selectDirectory(),          // Opens native folder picker
  scanForPRD(dirPath),        // Finds PRD files in directory
  spawnClaude(config),        // Starts Claude CLI process
  sendForgeResponse(data),    // Writes user answer to .forge/
  loadForgeLog(dir),          // Resume detection

  // Event listeners (main → renderer):
  onClaudeExit(callback),
  onStateUpdate(callback),
  onPresearchUpdate(callback),
  onBuildUpdate(callback),
  onConfigUpdate(callback),
  onRawOutput(callback),
  onToolUse(callback),
  onToolResult(callback),
  onSession(callback),
  onCost(callback),
  onTurnEnd(callback),
};
```

---

## Vite Configuration

**`vite.config.mjs`:**

```javascript
import preact from '@preact/preset-vite';

export default {
  plugins: [preact()],
  root: 'src',
  server: { port: 5173 },
  base: './',                          // Relative asset paths for Electron
  build: {
    outDir: '../dist-renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      'react': 'preact/compat',        // Allows React-style imports
      'react-dom': 'preact/compat',
    },
  },
};
```

---

## Bridge Layer (Main Process Modules)

### 1. claude-runner.js (~550 lines)

The core orchestrator that spawns and manages Claude CLI.

**What it does:**
- Spawns `claude` as child process with `--output-format stream-json`
- Creates `.forge/` directory in project, adds to `.gitignore`
- Installs gate-check Stop hook into Claude's settings
- Writes forge-protocol rules to `~/.claude/rules/` and `./.claude/rules/`
- Pipes stdout through JsonlParser, maps events to ForgeBus
- Handles interactive mode: writes `.forge/user-input.json`, resumes Claude after user answers
- Builds clean environment: sets `FORGE_ENABLED=true`, strips Electron-specific env vars

**Key methods:**
- `spawn(config)` — starts Claude with project dir, PRD, description, mode
- `respond(data)` — writes user input for interactive mode
- `kill()` — terminates Claude process tree
- `installForgeInfra()` — sets up .forge/ dir, hook, protocol rules

### 2. event-bus.js (~40 lines)

```javascript
class ForgeBus extends EventEmitter {}

// Event categories:
FORGE_STATE_EVENTS = [
  'forge:state-update',        // Master state changed
  'forge:presearch-update',    // Presearch questions/decisions changed
  'forge:build-update',        // Build phases/tasks changed
  'forge:mode-change',         // launch → presearch → build → complete
  'forge:status-change',       // idle → running → paused → error
  'forge:loop-change',         // Presearch loop changed
  'forge:phase-change',        // Build phase changed
  'forge:waiting-for-input',   // Interactive mode waiting
  'forge:config-update',       // Post-build config needed
];

CLAUDE_EVENTS = [
  'claude:session',            // Session started
  'claude:text',               // Text output
  'claude:tool-use',           // Tool invocation
  'claude:tool-result',        // Tool result
  'claude:cost',               // Token cost update
  'claude:turn-end',           // Turn completed
  'claude:error',              // Error occurred
  'claude:exit',               // Process exited
];
```

### 3. forge-state-watcher.js (~100 lines)

Polls `.forge/` directory every 500ms for state changes.

**How it works:**
- Tracks file fingerprints (mtime + size) to detect changes
- Reads and parses JSON files on change
- Compares new state to previous state, emits granular diff events
- Watches: `state.json`, `presearch-state.json`, `build-state.json`, `config-required.json`

### 4. jsonl-parser.js (~40 lines)

Streaming JSON Lines parser for Claude's `stream-json` output format.

- Buffers partial lines across chunks
- Handles CRLF line endings
- Emits parsed JSON objects one at a time
- Flushes remaining buffer on EOF

### 5. gate-check.js (Stop Hook)

Validation script executed after every Claude turn:

- Checks `.forge/state.json` exists and is valid JSON
- If presearch mode: validates `presearch-state.json`
- If build mode: validates `build-state.json`
- Exit code 0 = valid (turn allowed), exit code 2 = invalid (turn blocked)

---

## Dashboard UI (Preact Renderer)

### App.jsx — Root Component

Routes between 4 modes based on `state.mode`:
- `launch` → LaunchScreen
- `presearch` → PresearchWizard
- `build` → BuildDashboard
- `complete` → CompletionScreen/ConfigScreen

Manages:
- Costume changes via `setCostume()` based on presearch loop or build phase
- Elapsed timer (starts on spawn, stops on exit)
- Claude process exit handling

### Layout — 2-Zone Stacked

```
+------------------------------------------+
|  HeaderBar (title, project, timer, pause) |
+------------------------------------------+
|                                          |
|          Dashboard Zone (flex: 1)        |
|  (LaunchScreen / PresearchWizard /       |
|   BuildDashboard / CompletionScreen)     |
|                                          |
+------------------------------------------+
|       Claw'd Stage (180px fixed)         |
|         (Canvas, 30fps mascot)           |
+------------------------------------------+
```

### Launch Screen

- **Directory picker** — native Electron file dialog
- **PRD file chips** — auto-detected markdown files in project
- **Description textarea** — fallback if no PRD
- **Run mode toggle** — Autonomous vs Interactive
- **Resume detection** — checks for WORKFLOW_STATE.md
- States: `awaiting-target`, `project-ready`, `workflow-resumable`

### Presearch Wizard (7 components)

Interactive 5-loop wizard for architecture decisions:

**Loops:** Constraints → Discovery → Refinement → Plan → Gap Analysis

**Card types:**
- **QuestionCard** — Multiple choice with expandable options, recommended badges, pros/cons
- **TextCard** — Free-text input with submit
- **DecisionCard** — Read-only locked decision (green checkmark)
- **RegistryCard** — Technology selections with priority metadata
- **AccordionCard** — Expandable detail sections
- **RequirementsPanel** — Sidebar listing extracted requirements

**PresearchStepper** — 5-step indicator (filled = current, checkmark = completed)

### Build Dashboard (9 components)

Progress tracking for autonomous build:

- **PhaseStepper** — Horizontal roadmap of build phases
- **CardLog** — Scrollable task history with smart auto-scroll (pauses if user scrolls up)
- **TaskCard** — Task name, status badge (running/complete), commit hash, duration
- **BlockerCard** — Red error card requiring intervention
- **FailureCard** — Fatal error with stack trace
- **ContextCard** — Warning when context window usage is high
- **PauseScreen** — Overlay when build is paused
- **CompletionScreen** — Success summary with elapsed time, phase count, test results
- **ConfigScreen** — Post-build env var configuration form

### Shared Components

- **Card.jsx** — Base card container with consistent styling
- **Button.jsx** — Styled button with variants
- **Badge.jsx** — Status badge (running, complete, error, etc.)
- **ProConList.jsx** — Pros/cons display for option cards

---

## Claw'd Mascot System (Canvas)

### ClawdStage.jsx

Preact component that wraps a `<canvas>` element. On mount, calls `initStage(canvas)`. On resize, calls `resizeStage(canvas)`. On unmount, calls `destroyStage()`.

### stage-renderer.js

30fps render loop:

```javascript
function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // #0E0E0E background
  drawGroundLine(ctx, canvas);                         // Horizontal line at 80%
  mascot.update();
  mascot.draw(ctx);
  helperManager.update();
  helperManager.draw(ctx);
}
// Throttled to 33ms (30fps)
```

**Exported API:**
- `initStage(canvas)` — starts render loop
- `resizeStage(canvas)` — syncs canvas dimensions to parent
- `destroyStage()` — cancels animation frame
- `setCostume(eventKey)` — changes mascot costume
- `spawnHelper()` / `removeHelper()` — manages subagent sprites

### clawd-mascot.js

**14 costumes** mapped to workflow phases:

| Phase | Costume | Color |
|-------|---------|-------|
| Presearch: Constraints | detective | distinct shade |
| Presearch: Discovery | architect | distinct shade |
| Presearch: Refinement | scientist | distinct shade |
| Presearch: Plan | planner | distinct shade |
| Presearch: Gap Analysis | critic | distinct shade |
| Build: Bootstrap | builder | distinct shade |
| Build: Planning | coach | distinct shade |
| Build: Executing | foreman | distinct shade |
| Build: Review | inspector | distinct shade |
| Deploy | rocket | distinct shade |
| Complete | party | distinct shade |
| Error | error | red |
| Paused | coffee | neutral |
| Idle | idle | default |

**Animation:** Vertical bobbing via `y += sin(frameCount * 0.05) * 3`

**Rendering:** Loads `assets/sprites/clawSprite.png`, falls back to colored rectangle with costume label if sprite not available.

### helpers.js

Mini-Claw'd sprites representing subagents:

- **Max 6** visible at once
- **States:** entering → working → leaving
- **Animation:** Slide in from right with easing (`x += (targetX - x) * 0.1`), bob while working, fade and slide off left when done
- `spawn()` / `done()` / `update()` / `draw()` / `getActiveCount()`

---

## Hooks (Preact)

### useElapsedTimer.js
Ticks every second when `running=true`. Returns elapsed seconds as integer. Resets on running toggle.

### useForgeAPI.js
Returns `window.forgeAPI` (the preload IPC bridge) or null if not in Electron context.

### useForgeState.js
Subscribes to disk-state events via `window.forgeAPI.onStateUpdate()`, `onPresearchUpdate()`, `onBuildUpdate()`, `onConfigUpdate()`. Returns `{ state, presearch, build, config }` that updates on every poll cycle.

---

## Styles & Design Tokens

### theme.css — Design Tokens

```css
:root {
  /* Surface hierarchy */
  --surface-base: #0E0E0E;
  --surface-raised: #1A1A1A;
  --surface-overlay: #252525;

  /* Primary (orange) */
  --primary: #E8734A;
  --primary-hover: #F08A66;

  /* Text hierarchy */
  --text-primary: #FAF0E6;    /* cream */
  --text-secondary: #C4A882;  /* tan */
  --text-muted: #7A6B5D;

  /* Semantic */
  --error: #E84A4A;
  --warning: #E8B44A;
  --tertiary: #4AA8E8;

  /* Fonts */
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-code: 'JetBrains Mono', monospace;
  --font-pixel: 'Press Start 2P', monospace;
}
```

### global.css — Layout

- 2-zone flex layout: dashboard (flex: 1) + stage (180px fixed)
- Grain overlay (subtle noise texture on base surface)
- Thin dark scrollbars
- Terminal cursor blink animation

---

## Disk-State Architecture

The key architectural innovation of v2. Instead of parsing Claude's text output, Claude writes structured JSON files and the dashboard reads them.

### Files in `.forge/`

| File | Purpose | Written By |
|------|---------|-----------|
| `state.json` | Master state (mode, status, elapsed) | Claude |
| `presearch-state.json` | Questions, options, decisions, current loop | Claude |
| `build-state.json` | Phases, tasks, blockers, completion | Claude |
| `config-required.json` | Post-build env vars needed | Claude |
| `user-input.json` | User's answer to interactive questions | Dashboard |

### Flow

1. Claude writes/updates `.forge/*.json` files during execution
2. ForgeStateWatcher polls every 500ms, detects mtime/size changes
3. Watcher parses JSON, diffs against previous state
4. Emits granular events (mode-change, phase-change, waiting-for-input, etc.)
5. Main process forwards events to renderer via IPC
6. Preact hooks update component state

### Interactive Mode

1. Claude sets `waitingForInput: true` in presearch-state.json
2. Dashboard renders QuestionCard/TextCard
3. User selects option or types answer
4. Dashboard writes answer to `.forge/user-input.json`
5. Claude's Stop hook detects input file, Claude reads answer and continues

### Gate-Check Stop Hook

Installed into Claude's settings by claude-runner.js. Runs after every Claude turn:
- Validates all `.forge/` JSON files are parseable
- Blocks the turn if any file is missing or corrupt
- Ensures Claude maintains valid state at all times

---

## Testing

**Framework:** Vitest + @testing-library/preact + JSDOM

**35 test files, 284 tests passing**

### Test Coverage by Area

| Area | What's Tested |
|------|--------------|
| claude-runner | Spawn, JSONL event handling, resume, user input, cleanup |
| event-bus | Event emission, listener management |
| forge-state-watcher | File polling, change detection, diff events |
| gate-check | Validation logic for all state files |
| jsonl-parser | Streaming parsing, partial lines, CRLF |
| state-machines | Mode and status transitions |
| clawd-mascot | Costume changes, bob animation |
| helpers | Spawn, despawn, state transitions |
| stage-renderer | Init, resize, destroy, render loop |
| components | Rendering, interaction, state changes |
| hooks | Timer, API access, state subscription |
| styles | CSS token presence |
| integration | End-to-end disk-state flow |

### Test File Naming Convention
- `test/[module].test.js` — bridge modules
- `test/components/[Component].test.jsx` — Preact components
- `test/clawd/[module].test.js` — canvas modules
- `test/hooks/[hook].test.js` — hooks
- `test/integration/[flow].test.js` — integration tests

---

## Claude Code Configuration

### CLAUDE.md (Project Rules)

Defines:
- **Dev cycle:** Plan → Tasks → Agents (in worktrees) → Review → Merge
- **Core rules:** TDD, worktrees for all coding, conventional commits, memory bank updates
- **Quality gates:** `npx vitest run` + `npx eslint src/ --ext .js,.jsx`
- **PRESEARCH.md is the central authority** for all decisions

### settings.json

```json
{
  "permissions": {
    "allow": [
      "Bash(npm *)", "Bash(npx *)", "Bash(node *)",
      "Bash(git status*)", "Bash(git add*)", "Bash(git commit*)",
      "Bash(git diff*)", "Bash(git log*)", "Bash(git branch*)",
      "Bash(git checkout*)", "Bash(git merge*)", "Bash(git worktree*)",
      "Bash(git stash*)", "Bash(git show*)", "Bash(git remote*)",
      "Bash(git fetch*)", "Bash(git pull*)",
      "Bash(ls *)", "Bash(cat *)", "Bash(grep *)", "Bash(find *)",
      "Bash(mkdir *)", "Bash(cp *)", "Bash(mv *)", "Bash(rm *)",
      "Bash(chmod *)", "Bash(echo *)", "Bash(pwd)", "Bash(which *)",
      "Bash(test *)", "Bash(head *)", "Bash(tail *)", "Bash(wc *)",
      "Bash(sort *)", "Bash(touch *)",
      "Read", "Write", "Edit", "Glob", "Grep", "Agent"
    ],
    "deny": [
      "Bash(git push --force*)", "Bash(git push -f*)",
      "Bash(git reset --hard*)", "Bash(git clean -f*)",
      "Bash(git branch -D main*)", "Bash(git branch -D master*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "bash .claude/hooks/protect-env.sh" }]
      },
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "bash .claude/hooks/block-destructive-git.sh" }]
      }
    ]
  }
}
```

---

## Custom Skills (Full Contents)

### /commit — Conventional Commit

```markdown
# Commit Skill — Claw'd Forge

## Format
type(scope): short description

Body explaining why (optional for trivial changes).

Co-Authored-By: Claude <noreply@anthropic.com>

## Types
- feat — new feature or capability
- fix — bug fix
- refactor — code restructuring, no behavior change
- test — adding or updating tests
- chore — tooling, config, dependencies
- docs — documentation updates
- style — formatting, no logic change

## Scopes
- dashboard — Preact components, layout, shared UI
- bridge — stage-parser, event-bus, claude-runner, forge-log
- clawd — canvas stage, mascot, sprites, helpers
- launch — launch screen, directory picker
- presearch — presearch wizard, cards, stepper
- build-ui — build dashboard, card log, intervention cards
- skills — skill file modifications
- polish — packaging, branding, final refinements

## Rules
- Lowercase start, imperative mood
- Max 72 chars for subject line
- One logical change per commit
- Reference requirement IDs when implementing: feat(presearch): add question card (R-005)
```

### /code-quality — Quality Gates

```markdown
# Code Quality Skill — Claw'd Forge

## Quality Gate Commands
Run ALL before finishing any task:

npx vitest run          # Tests (unit + component)
npx eslint src/ --ext .js,.jsx   # Lint

## Standards
- No console.log in production code (use only in development/debug)
- Preact imports: Use import { h } from 'preact' or JSX with preact/compat alias
- CSS: Use CSS custom properties from src/styles/theme.css — never hardcode colors
- Event handling: Always use the ForgeBus event system, never direct DOM events
- IPC: Always use window.forgeAPI from preload — never import electron directly in renderer

## File Organization
- One component per file
- Co-locate component-specific styles as CSS modules
- Hooks in src/hooks/, shared components in src/components/shared/
- Bridge modules are CommonJS (main process), components are ESM (renderer)
```

### /tdd-workflow — Red-Green-Refactor

```markdown
# TDD Workflow Skill — Claw'd Forge

## Cycle: Red -> Green -> Refactor

### 1. Red — Write a Failing Test
import { render, screen } from '@testing-library/preact';
import { QuestionCard } from '../../src/components/presearch/QuestionCard';

test('renders question text', () => {
  render(<QuestionCard question="What database?" options={[]} />);
  expect(screen.getByText('What database?')).toBeTruthy();
});

Run: npx vitest run — confirm it fails for the right reason.

### 2. Green — Minimal Implementation
Write just enough code to make the test pass. No extras.

### 3. Refactor — Clean Up
Improve structure while keeping tests green.

## Coverage by Area
| Area            | Test Target                                        |
|-----------------|----------------------------------------------------|
| Bridge (parser) | Marker extraction, fallback regex, edge cases      |
| Bridge (bus)    | Pub/sub, listener cleanup                          |
| Bridge (log)    | Read/write/append, corrupt file handling            |
| Components      | Rendering, interaction, state transitions           |
| Integration     | Marker → event → card rendering pipeline            |
| Canvas (clawd/) | Costume transitions, helper spawn/despawn (unit)    |

## Test File Naming
- test/[module].test.js for bridge modules
- test/components/[Component].test.jsx for Preact components
- test/integration/[flow].test.js for integration tests
```

### /decision-log — Architecture Decision Records

```markdown
# Decision Log Skill — Claw'd Forge

## Format
Create files in decisions/ directory with sequential numbering:

# NNNN — Decision Title
## Status: Accepted | Revised | Superseded by NNNN
## Context: What motivates this decision?
## Decision: What change are we proposing?
## Alternatives Considered: Why rejected?
## Consequences: Positive, Negative, Risks
## References: PRESEARCH.md section, Requirements R-XXX

## When to Create
- Bootstrap decisions (0001)
- Spec revisions during build
- Technology changes or significant architectural shifts
- Any decision that future developers would ask "why?"
```

### /memory-bank — Cross-Session Persistence

```markdown
# Memory Bank Skill — Claw'd Forge

## 6-File Structure (memory-bank/)
| File               | Purpose                    | Update Frequency        |
|--------------------|----------------------------|------------------------|
| project-brief.md   | Scope, goals, requirements | Rarely (at start)      |
| product-context.md | Problem, solution, users   | Rarely                 |
| system-patterns.md | Architecture, patterns     | After structural changes|
| tech-context.md    | Stack, deps, deployment    | After dep changes      |
| active-context.md  | Current phase, next steps  | After every phase      |
| progress.md        | Done, remaining, issues    | After every phase      |

## Session Start Protocol
1. Read all 6 memory bank files
2. Read PRESEARCH.md for current authority
3. Read WORKFLOW_STATE.md for build progress
4. Check decisions/ for recent ADRs

## Update Triggers
- Phase complete: active-context.md + progress.md
- Architecture change: system-patterns.md
- New dependency: tech-context.md
- Spec revision: project-brief.md

## Plans Directory
Phase-specific plans in memory-bank/plans/
```

### /pr — Pull Request Template

```markdown
# PR Skill — Claw'd Forge

## Branch Naming
type/scope-short-description
Examples: feat/presearch-question-cards, fix/bridge-marker-parsing

## PR Template
## Summary — 1-3 bullet points
## Requirements Addressed — R-XXX: description
## Test Plan — checklist
## Screenshots — if UI changes

## Review Checklist
- Quality gates pass: npx vitest run + npx eslint src/
- No console.log in production code
- Conventional commit messages
- PRESEARCH.md requirements addressed
- Memory bank updated if phase boundary
```

---

## Safety Hooks

### protect-env.sh

Runs before every Write/Edit tool call. Blocks writes to files matching:
`.env`, `.env.local`, `.env.production`, `.env.staging`, `credentials`, `secrets`

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if [ -z "$FILE_PATH" ]; then exit 0; fi
BASENAME=$(basename "$FILE_PATH")
PROTECTED_PATTERNS=(".env" ".env.local" ".env.production" ".env.staging" "credentials" "secrets")
for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$BASENAME" == *"$pattern"* ]]; then
    echo "BLOCKED: Cannot write to '$FILE_PATH' -- matches protected pattern '$pattern'." >&2
    exit 2
  fi
done
exit 0
```

### block-destructive-git.sh

Runs before every Bash tool call. Blocks:
- `git push --force` / `git push -f`
- `git reset --hard`
- `git clean -f`
- `git branch -D main` / `git branch -D master`

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if [ -z "$COMMAND" ]; then exit 0; fi
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
  echo "BLOCKED: Force push not allowed." >&2; exit 2
fi
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard not allowed." >&2; exit 2
fi
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-[a-zA-Z]*f'; then
  echo "BLOCKED: git clean -f not allowed." >&2; exit 2
fi
if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D\s+(main|master)'; then
  echo "BLOCKED: Cannot delete main/master." >&2; exit 2
fi
exit 0
```

---

## Memory Bank System

Six markdown files in `memory-bank/` provide cross-session persistence:

| File | Contents |
|------|----------|
| `project-brief.md` | Scope (Electron desktop app), 32 requirements, MVP exclusions |
| `product-context.md` | Problem (terminal scrolling), solution (visual dashboard), UX principles (scannable, interactive, progressive disclosure, personality) |
| `system-patterns.md` | Disk-state architecture, event-bus pattern, 30fps render loop, card-based UI |
| `tech-context.md` | Full stack rationale, runtime/dev deps, deployment via electron-builder |
| `active-context.md` | Build complete, 284 tests, 0 lint errors, remaining stretch goals |
| `progress.md` | All 8 phases completed with metrics |

### Plans Directory

`memory-bank/plans/` contains phase-specific implementation plans:
- `phase-scaffold-detail.md` — CSS theme, Preact shell, shared components, Canvas placeholder
- `phase-bridge-detail.md` — Marker parser, event bus, forge-log, claude-runner, IPC wiring
- `path-b-disk-state.md` — Complete disk-state architecture redesign spec

---

## Decision Records

### ADR 0001 — Project Bootstrap (v1 → v2 Transition)

**Decision:** Rewrite from vanilla JS to Preact + Vite, switch from 3-panel to 2-zone layout, replace CRT aesthetic with Claude warm palette, add structured markers (later disk-state), hide terminal.

**Alternatives rejected:**
- Keep v1 (too rigid, no interactive presearch)
- React (overkill — Preact at 3kb is sufficient)
- Tauri (can't run node-pty for CLI spawning)

**Retained from v1:** Electron shell, event-bus pattern, Canvas for mascot

---

## Build & Development Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Run app (launch.js → Electron) |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run dev:build` | Build Vite output only (no packaging) |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Watch mode testing |
| `npm run lint` | ESLint check |
| `npm run quality` | Lint + tests combined |
| `npm run build` | Full build: Vite → dist-renderer, then electron-builder → .exe |

---

## Build Phases (How It Was Built)

The project was built in 8 sequential phases using an orchestrator/subagent pattern:

| # | Phase | What Was Built |
|---|-------|---------------|
| 1 | Bootstrap | CLAUDE.md, skills, memory bank, ADR 0001, project scaffold |
| 2 | Scaffold | CSS theme, Preact entry + shell, shared components (Card, Button, Badge), Canvas placeholder, Electron dev setup, ESLint |
| 3 | Bridge | JSONL parser, event bus v2, forge-log persistence, claude-runner upgrade, IPC wiring |
| 4 | Launch | LaunchScreen (directory picker, PRD scan, description, mode toggle, resume detection) |
| 5 | Presearch UI | PresearchWizard, PresearchStepper, QuestionCard, TextCard, DecisionCard, RegistryCard, RequirementsPanel |
| 6 | Build UI | BuildDashboard, PhaseStepper, CardLog, TaskCard, BlockerCard, FailureCard, ContextCard, PauseScreen, CompletionScreen, ConfigScreen |
| 7 | Claw'd Stage | stage-renderer (30fps loop), clawd-mascot (14 costumes), helpers (subagent sprites), ClawdStage wrapper |
| 8 | Polish | Skill modifications, packaging config, final testing, memory bank update |

**Development methodology:**
- **TDD throughout** — failing tests written first, then implementation
- **Worktree isolation** — all coding done in git worktrees, merged to main via `--no-ff`
- **Orchestrator/subagent delegation** — planning done by orchestrator, coding by subagents
- **Conventional commits** with scoped types
- **Memory bank updates** after every phase merge
- **Quality gates** (lint + test) enforced before every merge

---

## Known Issues & Limitations

1. **Placeholder sprites** — Claw'd and helpers render as colored rectangles; real AI-generated sprite sheets needed
2. **ESLint warnings** — 48 warnings (mostly unused-var false positives from JSX patterns)
3. **Unsigned .exe** — Triggers Windows Defender SmartScreen warnings
4. **No end-to-end test with live Claude** — Parsing edge cases may surface in real sessions
5. **No responsive canvas** — Redraws on resize but doesn't adapt aspect ratios
6. **No debug terminal** — Terminal is hidden; troubleshooting requires DevTools console
7. **Interactive mode edge cases** — Long sessions may need `--resume` handling
8. **Windows primary** — Not tested on macOS/Linux

---

## Final Metrics

| Metric | Value |
|--------|-------|
| Source files | 53 JS/JSX files in src/ |
| Test files | 35 |
| Tests passing | 284 |
| Lint errors | 0 |
| Lint warnings | 48 (JSX false positives) |
| Preact components | 22 |
| Bridge modules | 5 |
| Canvas modules | 3 |
| Custom hooks | 3 |
| Mascot costumes | 14 |
| Requirements tracked | 32 (29 must-have, 3 should-have) |
| Requirements addressed | 32/32 |
| Build phases | 8 |
| Runtime dependencies | 2 (preact, electron-reload) |
| Dev dependencies | 8 |
