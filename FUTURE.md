# Future Versions

## v2.2 — Post-Build Enhancements

### GitHub Integration
- "Push to GitHub" button on ConfigScreen
- Uses `gh repo create <name> --public --source . --push`
- Requires `gh` CLI installed and authenticated
- Show repo URL on success, error message if `gh` not found
- Option for public/private repo toggle

### Google Stitch MCP — Design Phase
- Add design phase between presearch and build
- Configure Stitch MCP server for the spawned Claude process
- Generate UI mockups during presearch design loop
- Display mockup previews in the dashboard
- Requires Stitch MCP server running and configured in target project `.mcp.json`

### Deployment Integration
- One-click deploy to Vercel/Railway/Netlify from ConfigScreen
- Run deployment command via Bash in target project
- Show deployment URL on success
- Stream deployment logs to build log panel

## v3 — LangGraph Migration

### Orchestrator Rewrite
- Replace Claude CLI `-p` spawning with LangGraph.js state machine
- Each phase becomes a graph node (researcher, architect, implementer, reviewer)
- Conditional edges for reroutes (implementer discovers architecture gap → loop back)
- SQLite checkpointer for durable state on desktop (natural fit for Electron)
- `interrupt()` primitive for interactive mode (replaces Stop hook polling)

### Multi-Model Routing
- Use Opus for architecture decisions, Sonnet for implementation
- Different node = different model via `@langchain/anthropic`

### Claude Agent SDK
- Evaluate Anthropic's native orchestration framework as alternative to LangGraph
- May be better fit since we're committed to Claude models

## v3.1 — Advanced Features

### Interactive Mode Polish
- Smoother turn-taking with `--resume` or LangGraph `interrupt()`
- User can edit Claude's presearch decisions before build starts
- Mid-build intervention: pause, adjust, continue

### Resume / Session Persistence
- Resume interrupted builds from `.forge/state.json`
- Show previous session history on LaunchScreen
- Diff view: what changed since last session

### Agent Isolation (Sebastian Model)
- Separate Claude instances per phase with restricted tool access
- Researcher: read-only tools
- Implementer: full write access in worktrees
- Reviewer: read + bash (for running tests)

### Observability
- Cost tracking dashboard (per-phase, per-agent)
- Token usage visualization
- Session replay from `.forge/` state history
