# PRESEARCH.md — Matrix Forge Command Deck

> **Central Authority** — the single source of truth for all build decisions.

---

## Executive Summary

Matrix Forge Command Deck is a standalone Electron desktop app that wraps the Claude CLI in a retro-futuristic 3-panel visual interface. It visualizes workflow execution in real time: a status panel (left), a pixel-art forge canvas (center), and a fully interactive terminal (right). The app auto-launches Claude with `/workflow` on startup and uses a stage parser to drive visual state changes in the forge.

## Project Thesis

The Claude CLI workflow skill is powerful but invisible — you can't see what stage it's in, what agents are active, or what decisions have been made without reading scrollback. Matrix Forge wraps the same execution in a visual layer that makes the workflow legible at a glance, while preserving full terminal interactivity. It's a living machine control panel, not a dashboard.

---

## Requirements Registry

| ID | Requirement | Category | Priority |
|----|------------|----------|----------|
| R-001 | Standalone desktop `.exe` wrapping Claude CLI workflow | Functional | Must-have |
| R-002 | 3-panel CSS Grid layout (left ~200px, center flex, right ~400px) | Functional | Must-have |
| R-003 | Default window 1400x800, resizable, panels handle resize gracefully | Functional | Must-have |
| R-004 | Left panel: status fields (project name, mode, phase, elapsed time, agents, decisions, artifacts, warnings) | Functional | Must-have |
| R-005 | Center panel: HTML5 Canvas retro pixel-art forge visualization at 30fps | Functional | Must-have |
| R-006 | Canvas layer stack: matrix rain, grid lines, energy conduits, forge, orchestrator, subagent pods, particles | Functional | Must-have |
| R-007 | Orchestrator sprite 64x64 with states: idle / dispatching / complete | Functional | Must-have |
| R-008 | Forge structure (canvas-drawn) with states: cold / active | Functional | Must-have |
| R-009 | Subagent pods 32x32 with states: spawning / working / done / error, max 6 + count badge | Functional | Must-have |
| R-010 | Energy conduits connecting orchestrator → forge → pods with traveling highlight | Functional | Must-have |
| R-011 | Matrix rain background: falling green characters, slow, ~0.15 opacity | Functional | Must-have |
| R-012 | Right panel: xterm.js terminal streaming raw Claude CLI stdout/stderr | Functional | Must-have |
| R-013 | xterm.js config: JetBrains Mono 13px, 5000 scrollback, blinking green cursor | Technical | Must-have |
| R-014 | Spawn Claude CLI via node-pty (PTY for full terminal emulation) with auto-launch | Technical | Must-have |
| R-015 | Stage parser: regex pattern matching on CLI output → typed events | Functional | Must-have |
| R-016 | Configurable patterns via patterns.json | Technical | Should-have |
| R-017 | Event bus (Node EventEmitter) forwarding parsed events to renderer via Electron IPC | Technical | Must-have |
| R-018 | 7 event types: stage:change, agent:spawn, agent:done, decision:lock, artifact:create, warning, mode:change | Functional | Must-have |
| R-020 | Visual style: deep dark bg (#1e1e2e), green palette, orange accent, CRT overlay | Functional | Must-have |
| R-021 | Fonts: Press Start 2P (bundled TTF) for headers, JetBrains Mono for terminal/data | Technical | Must-have |
| R-022 | Animation via opacity pulsing, color tinting, position offset, drawing primitives | Technical | Must-have |
| R-023 | Completion state: orchestrator solid, forge cooling, all pods done, final stats | Functional | Must-have |
| R-024 | Error state: orchestrator red tint, warning in left panel, error in terminal | Functional | Must-have |
| R-025 | Package as `.exe` via electron-builder | Technical | Must-have |
| R-026 | Particle sparks at connection points (2-3 frame loop) | Functional | Should-have |
| R-027 | CRT scanline CSS pseudo-element overlay with vignette | Functional | Should-have |
| R-028 | No React, no Phaser, no UI frameworks — vanilla JS + Canvas + xterm.js | Technical | Must-have |
| R-029 | Full interactive terminal (bidirectional stdin/stdout via PTY) | Functional | Must-have |
| R-030 | No persistent state between sessions | Technical | Must-have |
| R-031 | Sprite assets: orchestrator.png (64x64, provided), subagent.png (32x32, provided), forge (canvas-drawn) | Technical | Must-have |
| R-032 | Handle process exit: detect exit event → trigger completion or error UI states | Functional | Must-have |
| R-033 | Launch dialog: text input for project description/PRD path + "Start Forge" → auto-spawns Claude + /workflow | Functional | Must-have |

---

## Constraints Summary

| Constraint | Decision |
|-----------|----------|
| Timeline | No constraint — build for completion and polish |
| Audience | Personal use (single user, the developer) |
| Budget | $0 infrastructure — local desktop app |
| Scale | Single user, single session |
| Data sensitivity | None — local process only |
| Distribution | `.exe` on personal desktop |
| Error handling | Minimal — no graceful "Claude not installed" handling needed |

---

## Architecture

### Data Flow

```
User launches app
  → Launch dialog collects project description
  → Main process spawns Claude CLI via node-pty
  → PTY output flows two directions:
      1. Raw bytes → IPC → xterm.js (right panel, display + interaction)
      2. Line buffer → stage-parser → event-bus → IPC → renderer
          → status-panel (left panel, DOM updates)
          → forge-panel (center panel, canvas state changes)
  → User keystrokes in xterm.js → IPC → PTY stdin (interactive)
  → Claude process exits → IPC → all panels enter completion/error state
```

### IPC Channel Specification

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `claude:spawn` | main → renderer | `{ pid }` | Claude process started |
| `claude:exit` | main → renderer | `{ code, signal }` | Claude process exited |
| `terminal:data` | main → renderer | `string` (raw bytes) | PTY output for xterm.js |
| `terminal:input` | renderer → main | `string` (keystrokes) | User input from xterm.js → PTY stdin |
| `terminal:resize` | renderer → main | `{ cols, rows }` | xterm.js resize → PTY resize |
| `forge:event` | main → renderer | `{ type, payload }` | Parsed stage event for forge + status |

### Process Architecture

- **Main process** (`main.js`): Electron app lifecycle, spawns node-pty, runs stage parser, hosts event bus, forwards IPC
- **Preload script** (`preload.js`): `contextBridge.exposeInMainWorld` — exposes typed API for each IPC channel
- **Renderer process** (`index.html` + panel scripts): Receives events, updates DOM (left), canvas (center), xterm.js (right)

---

## Technical Stack

| Layer | Choice | Alternatives Considered | Why This Choice |
|-------|--------|------------------------|-----------------|
| Shell | Electron | Tauri (Rust, smaller binary but no node-pty), NW.js (less maintained) | Only option that gives child_process + Canvas + xterm.js + .exe packaging |
| Terminal emulator | xterm.js + xterm-addon-fit | None viable | Industry standard, same as VS Code |
| PTY | node-pty | child_process.spawn (no ANSI support, no arrow keys) | Required for interactive terminal with colors, cursor, tab completion |
| Center panel | HTML5 Canvas (vanilla) | Phaser (overkill), PixiJS (overkill), DOM (no pixel control) | Full pixel control for retro aesthetic, no framework overhead |
| Left panel | Plain DOM | — | Just text updates, simplest possible |
| Layout | CSS Grid | Flexbox (messier for 3-panel) | Trivial 3-panel layout |
| Module format | CommonJS (main/preload), ESM (renderer via script type=module) | Full ESM (Electron quirks with preload) | Path of least resistance for Electron |
| Testing | Vitest | Jest (slower, CJS-oriented), Playwright (overkill) | Fast, modern, great DX for unit tests |
| Dev reload | electron-reload | Manual restart | Auto-refresh renderer on file save |
| Packaging | electron-builder | electron-forge (heavier setup) | Standard, produces .exe with icon |
| Fonts | Press Start 2P (bundled TTF), JetBrains Mono (system/bundled) | Google Fonts CDN (requires network) | Desktop app — must work offline |

### Dependencies

```json
{
  "dependencies": {
    "node-pty": "^1.0.0",
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "electron-reload": "^2.0.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "@electron/rebuild": "^3.0.0",
    "vitest": "^1.0.0"
  }
}
```

Note: `@electron/rebuild` needed to compile `node-pty` native module for Electron's Node version.

---

## Visual Design Specification

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-deep` | `#1e1e2e` | Main background |
| `--bg-panel` | `#222238` | Left panel background (slightly lighter) |
| `--green-primary` | `#5b9a5b` | Sprite green, standard elements |
| `--green-bright` | `#4ade80` | Active states, highlights |
| `--green-dim` | `#2d5a3d` | Inactive states, shadows |
| `--orange-accent` | `#e8956a` | Forge heat, active warnings |
| `--white` | `#d4d4d4` | Highlights, primary terminal text |
| `--red-error` | `#e85555` | Errors only |
| `--outline-dark` | `#1a3a1a` | Sprite outlines |

### Typography

| Context | Font | Size | Weight |
|---------|------|------|--------|
| Panel title ("MATRIX FORGE") | Press Start 2P | 14px | Normal |
| Status labels | Press Start 2P | 8px | Normal |
| Status values | JetBrains Mono | 14px | Normal |
| Terminal | JetBrains Mono | 13px | Normal |

### CRT Overlay (CSS)

Pseudo-element on the app container:
- Repeating linear gradient for scanlines (2px spacing, rgba black at 0.1)
- Radial gradient vignette (transparent center, dark edges)
- `pointer-events: none` so it doesn't block interaction

---

## Canvas Specification

### Render Loop

- `requestAnimationFrame` with frame time check: skip frame if < 33ms since last frame (30fps cap)
- Clear canvas each frame (or use layered offscreen canvases for optimization if needed)
- Draw order (bottom to top): matrix rain → grid lines → energy conduits → forge → orchestrator → subagent pods → particles

### Matrix Rain

- Columns spaced ~14px apart (character width)
- Each column: array of characters falling at random speeds
- Character set: katakana-like glyphs drawn via `fillText` (no sprite needed)
- Opacity: ~0.15
- Trail effect: draw semi-transparent black rect over previous frame before drawing new characters

### Sprite Layout (responsive to canvas size)

```
Canvas height divided into thirds:
- Top third center: Orchestrator (64x64)
- Middle third center: Forge (48x48, canvas-drawn)
- Bottom third: Subagent pods in centered row (32x32 each, 16px gap)

Energy conduits: vertical lines from orchestrator bottom → forge top, forge bottom → each pod top
```

### State Machines

**Orchestrator:**
| State | Visual | Trigger |
|-------|--------|---------|
| idle | Dim, eye ports dark | Initial / no activity |
| dispatching | Bright, eye ports white, subtle pulse | agent:spawn event |
| complete | All solid green, no pulse | claude:exit (code 0) |
| error | Red tint overlay | claude:exit (non-zero) |

**Forge:**
| State | Visual | Trigger |
|-------|--------|---------|
| cold | Dim outline, no glow | Initial |
| active | Bright core, orange glow pulse | First stage:change or mode:change |
| cooling | Fade from active to dim over 2s | claude:exit |

**Subagent Pod:**
| State | Visual | Trigger |
|-------|--------|---------|
| empty | Not rendered | Initial |
| spawning | Fade in from 0 to 1 opacity over 0.5s | agent:spawn |
| working | Full opacity, subtle pulse | While active |
| done | Solid, green checkmark overlay | agent:done |
| error | Red tint | warning event (if agent-specific) |

### Energy Conduits

- 2px wide lines in `--green-dim`
- Traveling highlight: 4px bright segment that moves along the line at ~2px per frame
- Only active (highlight moving) when forge is in `active` state
- Conduit from orchestrator → forge: single vertical line
- Conduits from forge → each active pod: vertical lines branching from forge bottom

### Particles

- 4x4 pixel sparks at junction points (orchestrator↔conduit, conduit↔forge, forge↔conduit, conduit↔pod)
- Random position offset within 8px radius of junction
- 2-3 frame opacity cycle (bright → dim → off → bright)
- Only active when energy is flowing (forge in `active` state)
- ~3 particles per junction

---

## Stage Parser Specification

### Pattern Format (patterns.json)

```json
{
  "patterns": [
    {
      "event": "mode:change",
      "regex": "(presearch|build|planning|testing|deploying)",
      "flags": "i",
      "payloadKey": "mode",
      "captureGroup": 1
    },
    {
      "event": "stage:change",
      "regex": "\\[STAGE:(\\w+)\\]|Phase:?\\s+(\\w[\\w-]+)",
      "flags": "i",
      "payloadKey": "stage",
      "captureGroup": 1
    },
    {
      "event": "agent:spawn",
      "regex": "[Ll]aunching.*agent|[Ss]ubagent.*start|[Ss]pawning.*agent",
      "flags": "",
      "payloadKey": "name"
    },
    {
      "event": "agent:done",
      "regex": "[Ss]ubagent.*complete|agent.*finished|Agent.*returned",
      "flags": "",
      "payloadKey": "name"
    },
    {
      "event": "decision:lock",
      "regex": "[Dd]ecision.*locked|✅.*decided|LOCKED:",
      "flags": "",
      "payloadKey": "text"
    },
    {
      "event": "artifact:create",
      "regex": "[Cc]reated?\\s+(file|artifact)|[Ww]rit(ing|e).*\\.\\w+",
      "flags": "",
      "payloadKey": "path"
    },
    {
      "event": "warning",
      "regex": "⚠|[Ww]arning|[Bb]locker",
      "flags": "",
      "payloadKey": "text"
    }
  ]
}
```

Parser reads each line of PTY output, tests against each pattern in order, emits first match as a typed event on the event bus. Non-matching lines are ignored (they still appear in the terminal).

---

## Testing Strategy

### What Gets Tested (Vitest)

| Module | Test Focus |
|--------|-----------|
| `stage-parser.js` | Each regex pattern matches expected input lines. Edge cases (partial matches, multi-match lines). Payload extraction. |
| `event-bus.js` | Pub/sub: subscribe, emit, unsubscribe. Multiple listeners. Event typing. |
| Orchestrator state machine | State transitions: idle→dispatching→complete, idle→dispatching→error. Invalid transitions ignored. |
| Forge state machine | cold→active→cooling. Timing of cooling fade. |
| Subagent state machine | spawning→working→done, spawning→working→error. Max 6 pod enforcement. |

### What Doesn't Get Tested

- Canvas rendering (visual — test by inspection)
- Electron IPC (integration — test by running the app)
- xterm.js (third-party — trust it)
- CSS/layout (visual — test by inspection)

### TDD Workflow

Per user's TDD rule: write failing test → implement → refactor. Applies to stage parser, event bus, and state machines. Canvas and Electron wiring are tested manually by running the app.

---

## Failure Modes & Mitigations

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Claude CLI not on PATH | Spawn fails immediately | Show error in terminal panel. User knows what to do. |
| Claude process crashes | Terminal stops, forge stuck | Listen for exit/error on PTY → trigger error state (R-024) |
| Stage parser misses events | Forge stays cold, status stale | Terminal still works. Tune patterns.json after real session. |
| xterm.js resize breaks | Text garbled | fitAddon.fit() on window resize |
| Canvas perf degrades | Choppy animation | 30fps cap. Reduce matrix rain density if needed. |
| node-pty build fails | Can't compile for Electron | Use @electron/rebuild. Known-good versions documented. |
| Sprites fail to load | Blank spots on canvas | onerror fallback: draw colored rectangles |
| Font not loaded before canvas draw | Fallback font renders | Gate first frame on document.fonts.ready |

---

## Decision Confidence Ratings

| Decision | Confidence | Risk if Wrong | Reversibility |
|----------|-----------|---------------|---------------|
| Electron | High | Complete rewrite | Hard |
| node-pty for PTY | High | Required for interactive terminal | Hard (no alternative) |
| xterm.js | High | No viable alternative | Hard |
| Vanilla JS (no framework) | High | More boilerplate, full control | Easy to add later |
| Canvas for forge | High | Could use DOM but canvas is better | Medium |
| Vitest | High | Easy to swap | Easy |
| CommonJS main / ESM renderer | Medium | ESM migration is mechanical | Medium |
| Stage parser regex approach | Medium | May need tuning after real session | Easy (patterns.json) |
| 30fps target | High | Can reduce | Easy |
| electron-builder | High | Standard | Medium |

---

## Roadmap

### Phase Dependency Map

```
Phase: scaffold (none)
  ├── Phase: terminal (scaffold)
  ├── Phase: bridge (scaffold)
  │     └── Phase: status-panel (bridge)
  ├── Phase: canvas-base (scaffold)
  │     └── Phase: canvas-sprites-core (canvas-base, bridge)
  │           └── Phase: canvas-sprites-fx (canvas-sprites-core)
  └── Phase: polish (terminal, status-panel, canvas-sprites-fx)
        └── Phase: package (polish)
```

### Phase: scaffold (depends on: none)
**Requirements addressed:**
- R-001: Standalone desktop `.exe` wrapping Claude CLI
- R-002: 3-panel CSS Grid layout
- R-003: Default window 1400x800, resizable
- R-020: Visual style (dark bg, green palette)
- R-021: Fonts — bundle Press Start 2P locally
- R-028: No frameworks — vanilla JS

**Scope:** Bootstrap the Electron app with main process, preload script, and renderer HTML. Implement the 3-panel CSS Grid layout with correct proportions and dark theme. Bundle Press Start 2P font. Define IPC channel API surface in preload.

**Key risks:** None.
**Open decisions:** None.
**Parallel opportunities:** None — everything depends on this.
**Exit criteria:**
- [ ] Electron app launches as a window
- [ ] 3 panels visible with correct widths (~200px, flex, ~400px)
- [ ] Window opens at 1400x800, panels reflow on resize
- [ ] Background color #1e1e2e, green palette applied
- [ ] Press Start 2P renders for header text
- [ ] Zero framework dependencies
- [ ] Preload exposes all 6 IPC channels

### Phase: terminal (depends on: scaffold)
**Requirements addressed:**
- R-012: xterm.js terminal streaming raw Claude output
- R-013: xterm.js config (JetBrains Mono 13px, 5000 scrollback, green cursor)
- R-014: Spawn Claude CLI via node-pty with auto-launch
- R-029: Full interactive terminal (bidirectional via PTY)
- R-032: Handle process exit → emit event
- R-033: Launch dialog → auto-spawns Claude + /workflow

**Scope:** Implement the launch dialog overlay, Claude CLI spawning via node-pty in main process, and xterm.js in the right panel with full bidirectional I/O. User enters project description, clicks "Start Forge," app spawns Claude, pipes initial `/workflow` prompt, then user has full interactive control. Process exit detected and forwarded via IPC.

**Key risks:** node-pty native module rebuild for Electron. Use @electron/rebuild.
**Open decisions:** None.
**Parallel opportunities:** Can build alongside bridge and canvas-base.
**Exit criteria:**
- [ ] Claude stdout/stderr streams into xterm.js in real time
- [ ] Terminal uses JetBrains Mono 13px, 5000 scrollback, blinking green cursor
- [ ] Claude spawned via node-pty with full PTY
- [ ] User can type into terminal and Claude receives input (arrow keys, Ctrl+C work)
- [ ] Launch dialog appears, collects input, spawns Claude + /workflow on submit
- [ ] Process exit detected and `claude:exit` event emitted via IPC

### Phase: bridge (depends on: scaffold)
**Requirements addressed:**
- R-015: Stage parser regex → typed events
- R-016: Configurable patterns via patterns.json
- R-017: Event bus via Electron IPC
- R-018: 7 event types

**Scope:** Implement the stage parser (regex matching against each line of PTY output → typed events) and event bus (EventEmitter in main process, forwarded to renderer via IPC). TDD focus — most testable module. Load patterns from patterns.json.

**Key risks:** Regexes may not match real Claude output. Tunable via patterns.json.
**Open decisions:** None.
**Parallel opportunities:** Can build alongside terminal and canvas-base.
**Exit criteria:**
- [ ] Parser correctly identifies events from sample Claude output (Vitest passing)
- [ ] Patterns loaded from patterns.json
- [ ] Events flow from main → renderer via IPC
- [ ] All 7 event types fire correctly (Vitest passing)

### Phase: status-panel (depends on: bridge)
**Requirements addressed:**
- R-004: Left panel status fields

**Scope:** Implement left panel DOM updates. Subscribe to forge:event IPC channel, update fields on each event. Elapsed time timer starts on claude:spawn. Style with pixel font, dotted separators, green theme.

**Key risks:** None.
**Open decisions:** None.
**Parallel opportunities:** Can build alongside canvas-sprites-core.
**Exit criteria:**
- [ ] All 8 status fields render and update in response to events
- [ ] Elapsed timer ticks every second from spawn
- [ ] Styled correctly (fonts, colors, separators)

### Phase: canvas-base (depends on: scaffold)
**Requirements addressed:**
- R-005: Canvas at 30fps
- R-011: Matrix rain background
- R-006: Grid lines layer

**Scope:** Set up canvas render loop with 30fps throttling. Implement matrix rain (falling green character columns at ~0.15 opacity) and subtle grid lines. Handle canvas resize. Gate first frame on document.fonts.ready.

**Key risks:** Matrix rain performance — profile early.
**Open decisions:** None.
**Parallel opportunities:** Can build alongside terminal and bridge.
**Exit criteria:**
- [ ] Canvas renders at stable 30fps
- [ ] Matrix rain visible with correct character style and opacity
- [ ] Grid lines visible at ~0.05 opacity
- [ ] Canvas resizes with window
- [ ] First frame waits for font load

### Phase: canvas-sprites-core (depends on: canvas-base, bridge)
**Requirements addressed:**
- R-007: Orchestrator sprite + states
- R-008: Forge structure + states
- R-009: Subagent pods + states
- R-022: Animation (pulsing, tinting, bobbing)
- R-023: Completion state
- R-024: Error state
- R-031: Sprite assets
- R-032: Completion/error states trigger on process exit

**Scope:** Load orchestrator.png and subagent.png. Draw forge programmatically. Implement state machines for orchestrator, forge, and subagent pods. Wire state transitions to event bus. Implement completion and error visual states triggered by process exit.

**Key risks:** Multiple interacting state machines. Test state transitions with Vitest.
**Open decisions:** None.
**Parallel opportunities:** Can build alongside status-panel.
**Exit criteria:**
- [ ] Orchestrator renders, transitions idle→dispatching→complete/error
- [ ] Forge renders (canvas-drawn), transitions cold→active→cooling
- [ ] Subagent pods render, all 4 states work, max 6 + badge
- [ ] Pulsing/tinting/bobbing visible on active sprites
- [ ] Completion state triggers on successful exit
- [ ] Error state triggers on failed exit
- [ ] State machine tests passing (Vitest)

### Phase: canvas-sprites-fx (depends on: canvas-sprites-core)
**Requirements addressed:**
- R-010: Energy conduits with traveling highlight
- R-026: Particle sparks at junctions

**Scope:** Draw energy conduit lines connecting orchestrator → forge → pods with traveling highlight animation. Add particle spark effects at connection junctions. Only active when forge is in active state.

**Key risks:** Performance with all layers active. Profile.
**Open decisions:** None.
**Parallel opportunities:** None.
**Exit criteria:**
- [ ] Energy conduits visible between all connected sprites
- [ ] Traveling highlight moves along conduits
- [ ] Particle sparks visible at junctions
- [ ] Effects only active when forge is active
- [ ] Stable 30fps with all layers rendering

### Phase: polish (depends on: terminal, status-panel, canvas-sprites-fx)
**Requirements addressed:**
- R-020: Full visual style polish
- R-027: CRT scanline overlay with vignette
- R-003: Resize handling polish

**Scope:** Add CRT scanline CSS overlay. Polish all transitions, timing, colors. Ensure resize is smooth across all panels. Final visual QA.

**Key risks:** None — cosmetic.
**Open decisions:** None.
**Exit criteria:**
- [ ] CRT scanlines and vignette visible
- [ ] All colors/fonts/styles match spec
- [ ] Resize smooth across all panels

### Phase: package (depends on: polish)
**Requirements addressed:**
- R-025: Package as `.exe`
- R-001: Standalone executable

**Scope:** Configure electron-builder.yml, set icon, build .exe, test cold launch.

**Key risks:** Windows Defender may flag unsigned exe. Expected.
**Open decisions:** None.
**Exit criteria:**
- [ ] `npm run build` produces working .exe
- [ ] .exe launches from desktop, full app functional

---

## MVP Validation Checklist

| R-ID | Requirement | Phase | Priority | Status |
|------|------------|-------|----------|--------|
| R-001 | Standalone .exe | scaffold + package | Must-have | Planned |
| R-002 | 3-panel layout | scaffold | Must-have | Planned |
| R-003 | 1400x800 resizable | scaffold + polish | Must-have | Planned |
| R-004 | Status fields | status-panel | Must-have | Planned |
| R-005 | Canvas 30fps | canvas-base | Must-have | Planned |
| R-006 | Canvas layer stack | canvas-base + canvas-sprites-fx | Must-have | Planned |
| R-007 | Orchestrator states | canvas-sprites-core | Must-have | Planned |
| R-008 | Forge states | canvas-sprites-core | Must-have | Planned |
| R-009 | Subagent pods | canvas-sprites-core | Must-have | Planned |
| R-010 | Energy conduits | canvas-sprites-fx | Must-have | Planned |
| R-011 | Matrix rain | canvas-base | Must-have | Planned |
| R-012 | xterm.js streaming | terminal | Must-have | Planned |
| R-013 | xterm.js config | terminal | Must-have | Planned |
| R-014 | node-pty spawn | terminal | Must-have | Planned |
| R-015 | Stage parser | bridge | Must-have | Planned |
| R-016 | patterns.json | bridge | Should-have | Planned |
| R-017 | Event bus IPC | bridge | Must-have | Planned |
| R-018 | 7 event types | bridge | Must-have | Planned |
| R-020 | Visual style | scaffold + polish | Must-have | Planned |
| R-021 | Bundled fonts | scaffold | Must-have | Planned |
| R-022 | Canvas animations | canvas-sprites-core | Must-have | Planned |
| R-023 | Completion state | canvas-sprites-core | Must-have | Planned |
| R-024 | Error state | canvas-sprites-core | Must-have | Planned |
| R-025 | .exe packaging | package | Must-have | Planned |
| R-026 | Particle sparks | canvas-sprites-fx | Should-have | Planned |
| R-027 | CRT overlay | polish | Should-have | Planned |
| R-028 | Vanilla JS | scaffold | Must-have | Planned |
| R-029 | Interactive terminal | terminal | Must-have | Planned |
| R-030 | No persistent state | — | Must-have | N/A (constraint) |
| R-031 | Sprite assets | canvas-sprites-core | Must-have | Planned |
| R-032 | Process exit handling | terminal + canvas-sprites-core | Must-have | Planned |
| R-033 | Launch dialog + auto-spawn | terminal | Must-have | Planned |

---

## Scope Tiers

**Must-have (all):** R-001–R-015, R-017–R-018, R-020–R-025, R-028–R-033
**Should-have:** R-016 (patterns.json config), R-026 (particles), R-027 (CRT overlay)
**Cut-if-behind:** Nothing — building for completion.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| node-pty native rebuild fails | Medium | Use @electron/rebuild, pin known-good versions |
| Stage parser misses real events | Medium | Terminal still works. Tune patterns.json after first session. |
| Canvas perf with all layers | Low | 30fps cap, reduce rain density if needed |
| Electron unsigned exe warning | Expected | Click through — personal use |

---

## Bootstrap Configuration

### Directory Structure

```
matrix-forge/
├── package.json
├── electron-builder.yml
├── main.js                     # Electron main process
├── preload.js                  # IPC bridge (contextBridge)
├── src/
│   ├── index.html              # 3-panel CSS Grid shell
│   ├── styles/
│   │   └── deck.css            # Full theme, grid, CRT overlay, fonts
│   ├── bridge/
│   │   ├── claude-runner.js    # Spawns Claude via node-pty
│   │   ├── stage-parser.js     # Regex pattern matcher → typed events
│   │   ├── patterns.json       # Configurable match patterns
│   │   └── event-bus.js        # Pub/sub EventEmitter
│   ├── panels/
│   │   ├── status-panel.js     # Left panel — DOM updates
│   │   ├── forge-panel.js      # Center panel — Canvas orchestration
│   │   └── terminal-panel.js   # Right panel — xterm.js setup
│   ├── forge/
│   │   ├── renderer.js         # requestAnimationFrame loop, 30fps
│   │   ├── sprites.js          # Image loader, draw helpers
│   │   ├── orchestrator.js     # State machine + draw
│   │   ├── forge-core.js       # Canvas-drawn forge + state machine
│   │   ├── subagent.js         # Pod state machine + draw
│   │   ├── matrix-rain.js      # Falling character columns
│   │   ├── energy-lines.js     # Conduit connections + highlights
│   │   └── particles.js        # Spark effects
│   └── assets/
│       ├── sprites/
│       │   ├── orchestrator.png
│       │   └── subagent.png
│       └── fonts/
│           └── PressStart2P.ttf
├── test/
│   ├── stage-parser.test.js
│   ├── event-bus.test.js
│   ├── orchestrator.test.js
│   ├── forge-core.test.js
│   └── subagent.test.js
└── .gitignore
```

### Gitignore

```
node_modules/
dist/
out/
STUDY_GUIDE.md
WORKFLOW_STATE.md
```

### Workflow Preferences

- TDD: Yes (stage parser, event bus, state machines)
- Worktree isolation for agents: No (single developer)
- Memory bank: No (handled by workflow state)
