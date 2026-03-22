# System Patterns — Claw'd Forge v2

## Architecture
```
Electron Main Process (Node.js)
  ├── claude-runner.js    — Spawns Claude CLI via node-pty (hidden)
  ├── stage-parser.js     — Extracts [FORGE:*] markers + regex fallback
  ├── event-bus.js        — EventEmitter pub/sub
  ├── forge-log.js        — JSON persistence for card log
  └── IPC bridge          — contextBridge to renderer

Electron Renderer Process (Preact + Vite)
  ├── App.jsx             — 2-zone layout: Dashboard + ClawdStage
  ├── components/         — Preact UI: launch, presearch cards, build cards
  ├── hooks/              — useForgeEvents, useAutoScroll, useElapsedTimer
  └── clawd/              — Vanilla JS Canvas (30fps mascot stage)
```

## Data Flow
```
Claude CLI (PTY) → stage-parser → event-bus → IPC → renderer
                                                   ├── Dashboard (Preact cards)
                                                   └── ClawdStage (Canvas)

User interaction → Dashboard → IPC → stdin translation → PTY stdin
```

## Key Patterns
- **Structured Marker Protocol**: `[FORGE:TYPE key=value]` markers in Claude output
- **Event-driven architecture**: Parser → Bus → IPC → Components
- **Card-based UI**: All interactions are card components (Question, Decision, Task, etc.)
- **Costume system**: Sprite sheet swaps on phase/stage events
- **Stdin translation**: User card clicks → natural language text → PTY stdin
