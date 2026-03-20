# Matrix Forge Command Deck — PRD

## Overview

The Matrix Forge Command Deck is a standalone desktop executable that wraps the Claude-based workflow skill in a visual interface. It visualizes the workflow in real time so you can see what stage it is in, what agents are active, what decisions have been made, and what Claude is doing right now.

It is not meant to replace the workflow. It is a visual layer on top of real Claude CLI execution.

## Core Goal

A lightweight retro-futuristic command deck that shows workflow progress in a way that is:

- Readable and scannable at a glance
- Visually distinctive — Matrix-inspired retro pixel-art
- Tied to real execution — not a mock or demo
- Low-overhead and performant

The app should feel like a living machine control panel, not a game and not a generic dashboard.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Shell | Electron | Wraps to `.exe`, spawns Claude CLI via `child_process`, handles IPC |
| Center panel | HTML5 Canvas (vanilla) | Full pixel-level control for retro aesthetic, no framework overhead |
| Right panel | xterm.js | Battle-tested terminal emulator, full ANSI color support, same as VS Code uses |
| Left panel | Plain DOM | Simple text updates, no framework needed |
| Layout | CSS Grid | 3-panel layout, trivial to implement |
| Packaging | electron-builder | Produces single `.exe` with icon |

No React. No Phaser. No UI frameworks. Vanilla JS + Canvas + xterm.js.

## Visual Style

Inspired by the Claude Code terminal welcome screen aesthetic:

- **Background**: Deep dark (`#1e1e2e`)
- **Primary green**: `#5b9a5b` (sprite green, from the bot assets)
- **Bright green**: `#4ade80` (active states, terminal text highlights)
- **Dim green**: `#2d5a3d` (inactive states, shadows, subtle elements)
- **Orange accent**: `#e8956a` (forge heat, active warnings — from Claude's pig)
- **White**: `#d4d4d4` (eye ports, highlights, primary terminal text)
- **Red**: `#e85555` (errors only)
- **Dark outline**: `#1a3a1a` (sprite outlines)
- **Font — headers**: `"Press Start 2P"` (pixel font from Google Fonts)
- **Font — terminal/data**: `"JetBrains Mono"` or `"Fira Code"`
- **Borders**: Dotted/dashed separator lines matching Claude terminal style (`·····`)
- **CRT overlay**: CSS pseudo-element with scanlines + slight vignette

## Layout

3-panel interface using CSS Grid.

```
┌──────────────┬─────────────────────────┬──────────────────────┐
│              │                         │                      │
│  LEFT PANEL  │     CENTER PANEL        │    RIGHT PANEL       │
│  Status      │     The Forge           │    Terminal           │
│  ~200px      │     flex: 1             │    ~400px            │
│              │                         │                      │
│              │                         │                      │
│              │                         │                      │
│              │                         │                      │
│              │                         │                      │
│              │                         │                      │
└──────────────┴─────────────────────────┴──────────────────────┘
```

Default window size: 1400x800. Resizable. Panels should handle resize gracefully (canvas redraws, xterm reflows).

---

## Panel Specifications

### Left Panel — Workflow Status

A vertically stacked summary of human-readable state. Mostly static, easy to scan.

**Fields to display:**

| Field | Source | Update frequency |
|-------|--------|-----------------|
| Project name | Parsed from Claude output or user input at launch | Once |
| Current mode | `presearch` / `build` / `idle` | On stage change |
| Current phase | e.g., `3/6 — Planning` | On stage change |
| Elapsed time | Timer started at launch | Every second |
| Active agent count | Parsed from agent spawn/done events | On agent events |
| Locked decisions | Count of decisions parsed from output | On decision events |
| Artifacts created | Count of files/outputs detected | On artifact events |
| Warnings / blockers | Parsed warning lines | On warning events |

**Visual treatment:**
- Each field is a label + value pair, left-aligned
- Labels in dim green, values in bright green or white
- Section dividers using dotted lines (`·····`)
- Title "MATRIX FORGE" at top in pixel font
- Subtle background slightly lighter than the main bg (`#222238`)

### Center Panel — The Forge (Canvas)

The heart of the interface. A retro pixel-art visualization of the workflow as a machine system.

**Canvas render loop:** 30fps via `requestAnimationFrame` with frame throttling.

**Scene layout (top to bottom):**

```
┌─────────────────────────────┐
│     Matrix rain background  │
│                             │
│    ┌───────────────────┐    │
│    │   ORCHESTRATOR    │    │  ← top third
│    │   (sentinel)      │    │
│    └───────┬───────────┘    │
│            │ energy lines   │
│    ┌───────┴───────────┐    │
│    │      FORGE        │    │  ← middle third
│    │   (crucible)      │    │
│    └──┬────┬────┬──────┘    │
│       │    │    │           │
│    ┌──┴┐ ┌─┴─┐ ┌┴──┐       │
│    │bot│ │bot│ │bot│       │  ← bottom third
│    └───┘ └───┘ └───┘       │
│     SUBAGENT PODS           │
└─────────────────────────────┘
```

**Layer stack (bottom to top):**

1. **Matrix rain** — Falling green characters, slow speed, low opacity (~0.15). Classic vertical streams of random characters descending. Covers full canvas.
2. **Grid lines** — Very subtle pixel grid pattern at ~0.05 opacity. Gives a "machine blueprint" feel.
3. **Energy conduits** — Pixel-art vertical/horizontal lines connecting orchestrator → forge → active pods. Animate by shifting a bright pixel highlight along the line (1px per frame).
4. **Forge structure** — Static sprite centered in the middle third. States: `cold` (dim) / `active` (glowing core).
5. **Orchestrator** — Static sprite centered in the top third. States: `idle` (dim ports) / `dispatching` (bright ports) / `complete` (all solid).
6. **Subagent pods** — Small bot sprites arranged in a row at the bottom third. Each has states: `spawning` (fade in) / `working` (pulsing) / `done` (solid + checkmark) / `error` (red tint). Max display: 6 pods. If more than 6 agents, show count badge.
7. **Particle layer** — Small spark sprites at connection points between conduits and machines. 2-3 frame loop.

**Sprite assets (static PNGs — no animation frames for v1):**

| Sprite | Size | File |
|--------|------|------|
| Orchestrator | 64x64 | `orchestrator.png` (provided by user) |
| Subagent bot | 32x32 | `subagent.png` (provided by user) |
| Forge | 48x48 | `forge.png` (to be created — or placeholder rectangle) |
| Spark particle | 4x4 | Generated on canvas (no asset needed) |
| Matrix glyph set | 8x8 each | Generated on canvas using text rendering |

**State changes driven by:** events from the stage parser (see Bridge section).

**For v1, "animation" is achieved through:**
- Opacity pulsing (sine wave on alpha)
- Color tinting (multiply blend or manual pixel swap)
- Position offset (subtle float/bob on active sprites)
- Drawing primitives for energy lines and particles (no sprite sheet needed)

This keeps v1 simple — static sprites with canvas-driven effects.

### Right Panel — Terminal

The real Claude execution stream. The most "honest" panel — proves the visual is tied to real execution.

**Implementation:** xterm.js instance filling the panel.

**Configuration:**
- Theme matching the app palette (dark bg, green/white text)
- Font: `"JetBrains Mono"`, 13px
- Scrollback: 5000 lines
- Cursor: blinking block, green

**Data source:** Raw stdout + stderr from the Claude CLI subprocess, piped directly. No filtering — every line Claude outputs appears here.

**Tab bar (optional, v2):**
- `Terminal` (default) — raw output
- `Events` — filtered view of parsed stage/agent events
- `Decisions` — list of locked decisions

For v1, just the terminal tab.

---

## Bridge — Claude CLI ↔ UI

### Claude Runner (`claude-runner.js`)

Spawns the Claude CLI as a child process from Electron's main process.

**Launch command:**
```
claude --dangerously-skip-permissions
```

The user provides the initial prompt (project description or PRD path) via a launch dialog or command-line argument.

**Process management:**
- Spawn with `child_process.spawn`
- Pipe `stdout` and `stderr` separately
- Forward raw output to the renderer process via IPC for xterm.js
- Also forward each line to the stage parser
- Handle process exit (update UI to "complete" or "error" state)

### Stage Parser (`stage-parser.js`)

Pattern-matches Claude's output line by line and emits typed events.

**Event types:**

| Event | Trigger pattern (regex) | Payload |
|-------|------------------------|---------|
| `stage:change` | `/\[STAGE:(\w+)\]/` or phase-related keywords | `{ stage: string }` |
| `agent:spawn` | `/[Ll]aunching.*agent/` or `/[Ss]ubagent.*start/` | `{ name?: string }` |
| `agent:done` | `/[Ss]ubagent.*complete/` or `/agent.*finished/` | `{ name?: string }` |
| `decision:lock` | `/[Dd]ecision.*locked/` or `/✅.*decided/` | `{ text: string }` |
| `artifact:create` | `/[Cc]reated?\s+(file|artifact)/` or `/[Ww]riting.*\.\w+/` | `{ path?: string }` |
| `warning` | `/⚠|[Ww]arning|[Bb]locker/` | `{ text: string }` |
| `mode:change` | `/presearch|build|planning|testing|deploying/i` | `{ mode: string }` |

These patterns should be tunable. Store them in a `patterns.json` config file so they can be updated as the workflow skill evolves without rebuilding.

### Event Bus (`event-bus.js`)

Simple pub/sub connecting the parser to all three panels.

```
stage-parser → event-bus → status-panel (left)
                         → forge-panel (center)
                         → terminal-panel (right, for event overlay in v2)
```

Implementation: Node `EventEmitter` in main process, forwarded to renderer via Electron IPC (`ipcMain` / `ipcRenderer`).

---

## Application Flow

### Launch

1. User double-clicks the `.exe` (or runs from terminal)
2. Electron window opens with the 3-panel layout
3. A simple launch dialog appears over the center panel:
   - Text input: "Project description or path to PRD"
   - "Start Forge" button
4. On submit, the app spawns the Claude CLI with the user's input as the initial prompt
5. The forge visualization enters "cold → heating" state
6. Terminal panel begins streaming Claude's output

### During Execution

- Stage parser processes each line of Claude output
- Events flow to all panels via the event bus
- Left panel updates status fields
- Center panel updates sprite states and effects
- Right panel streams raw output
- Timer ticks every second

### Completion

- Claude process exits
- Orchestrator enters "complete" state (all ports solid)
- Forge enters "cooling" state
- All subagent pods show "done"
- Left panel shows final stats
- Terminal shows exit status

### Error

- If Claude process crashes or errors
- Orchestrator enters "error" state (red tint)
- Left panel shows error in warnings section
- Terminal shows the error output

---

## File Structure

```
matrix-forge/
├── package.json
├── electron-builder.yml
├── forge.ico
├── main.js                     # Electron main process
├── preload.js                  # IPC bridge (contextBridge)
├── src/
│   ├── index.html              # 3-panel CSS Grid shell
│   ├── styles/
│   │   └── deck.css            # Full theme, grid layout, CRT overlay, fonts
│   │
│   ├── bridge/
│   │   ├── claude-runner.js    # Spawns claude CLI, manages process lifecycle
│   │   ├── stage-parser.js     # Regex pattern matcher → typed events
│   │   ├── patterns.json       # Configurable match patterns
│   │   └── event-bus.js        # Pub/sub EventEmitter
│   │
│   ├── panels/
│   │   ├── status-panel.js     # Left panel — DOM text updates
│   │   ├── forge-panel.js      # Center panel — Canvas orchestration
│   │   └── terminal-panel.js   # Right panel — xterm.js setup + theming
│   │
│   ├── forge/
│   │   ├── renderer.js         # requestAnimationFrame loop, 30fps throttle
│   │   ├── sprites.js          # Image loader, draw helpers
│   │   ├── orchestrator.js     # Orchestrator state machine + draw
│   │   ├── forge-core.js       # Forge structure state machine + draw
│   │   ├── subagent.js         # Subagent pod state machine + draw
│   │   ├── matrix-rain.js      # Falling character columns
│   │   ├── energy-lines.js     # Conduit connections + traveling highlights
│   │   └── particles.js        # Spark effects at junctions
│   │
│   └── assets/
│       ├── sprites/
│       │   ├── orchestrator.png  # 64x64, provided
│       │   ├── subagent.png      # 32x32, provided
│       │   └── forge.png         # 48x48, placeholder or generated
│       └── fonts/
│           └── PressStart2P.ttf  # Pixel font for headers
│
└── test/
    ├── stage-parser.test.js     # Pattern matching unit tests
    ├── event-bus.test.js        # Pub/sub unit tests
    └── forge-renderer.test.js   # Canvas state transition tests
```

---

## Build Order

### Phase 1 — Skeleton (get a window with 3 panels)
1. `npm init` + install electron, xterm.js
2. Create `main.js`, `preload.js`, `index.html`
3. CSS Grid 3-panel layout with dark theme
4. Verify: app launches, 3 colored panels visible

### Phase 2 — Terminal panel (prove Claude runs)
5. Implement `claude-runner.js` — spawn Claude CLI
6. Implement `terminal-panel.js` — xterm.js instance
7. Wire stdout/stderr → xterm.js via IPC
8. Verify: launch app, see Claude output streaming in right panel

### Phase 3 — Stage parser (the critical bridge)
9. Write `stage-parser.test.js` with sample output lines
10. Implement `stage-parser.js` — regex matching → events
11. Implement `event-bus.js` — simple pub/sub
12. Verify: tests pass, events fire for known patterns

### Phase 4 — Status panel (left)
13. Implement `status-panel.js` — subscribe to events, update DOM
14. Style with pixel font, dotted separators, green theme
15. Verify: left panel updates as Claude runs

### Phase 5 — Forge canvas (center, background)
16. Implement `renderer.js` — 30fps canvas loop
17. Implement `matrix-rain.js` — falling green characters
18. Add subtle grid lines
19. Verify: center panel shows animated Matrix rain

### Phase 6 — Forge sprites (center, foreground)
20. Implement `sprites.js` — load PNGs, draw at position
21. Implement `orchestrator.js` — draw sprite, state-driven opacity/tint
22. Implement `forge-core.js` — draw forge sprite (or placeholder rect)
23. Implement `subagent.js` — draw bot sprites in row, state-driven effects
24. Implement `energy-lines.js` — draw connecting lines with traveling highlights
25. Wire all to event bus — stage changes drive sprite states
26. Verify: sprites appear, respond to workflow events

### Phase 7 — Polish
27. CRT scanline CSS overlay
28. Particle sparks at connection points
29. Launch dialog UI
30. Window title, icon, resize handling

### Phase 8 — Package
31. Configure `electron-builder.yml`
32. Build `.exe`
33. Test on clean machine
34. Place on desktop with icon

---

## Non-Goals (v1)

- No interactivity with Claude (read-only visualization)
- No animated sprite sheets (static sprites + canvas effects only)
- No sound effects
- No persistent state between sessions
- No multi-project support
- No settings UI (configure via `patterns.json` only)
- No tab switching in terminal panel (just raw terminal)

## Future (v2+)

- Animated sprite sheets (walk cycles, working animations)
- Terminal tabs (Events, Decisions, Diffs)
- Interactive mode (type into Claude via the terminal panel)
- Session history / replay
- Sound effects (forge heating, agent dispatch chime, completion fanfare)
- Custom sprite upload
- Multiple workflow tracking
