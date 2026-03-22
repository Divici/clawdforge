# Phase: bridge — Detailed Plan

## Tasks
1. Structured marker parser (stage-parser.js upgrade) — R-018, R-020
2. Event bus v2 constants — R-018 supporting
3. forge-log.js persistence — R-021
4. claude-runner.js upgrade (FORGE_ENABLED + hidden PTY) — R-027, R-029
5. main.js + preload.js IPC wiring — R-018, R-019, R-027
6. ESLint verification

## Execution Order
- Tasks 1, 2, 3, 4 in parallel
- Task 5 after all above
- Task 6 final verification

## Key Decisions
- Extract translateAction to src/bridge/stdin-translator.js (pure, testable)
- Normalize marker types: AGENT_SPAWN -> forge:agent-spawn (hyphens, not underscores)
- Increase ForgeBus maxListeners to 50
- Use direct writeFileSync (not atomic rename) for Windows compatibility
