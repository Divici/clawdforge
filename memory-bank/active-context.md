# Active Context — Claw'd Forge v2

## Current Phase
launch — Launch screen, resume detection, header bar

## Just Completed
- Phase: bridge (145 tests passing)
  - Structured [FORGE:*] marker parser with 17 marker types
  - v1 regex fallback preserved
  - forge-log.js persistence for card log reconstruction
  - stdin-translator.js for dashboard-to-PTY action mapping
  - FORGE_ENABLED env var on Claude spawn
  - Hidden PTY (no raw terminal output to renderer)
  - main.js wired: v2 event forwarding, forge-log integration, stdin translation
  - preload.js extended: sendForgeResponse, loadForgeLog

## Next Steps
1. Phase: launch — Launch screen, resume detection, header bar
2. Phase: presearch-ui (depends on launch)
3. Phase: build-ui (depends on presearch-ui)
4. Parallel after bridge: clawd-stage, skill-mods
