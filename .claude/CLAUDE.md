# Claw'd Forge — Development Rules

## Project Overview
Claw'd Forge is an Electron desktop app that wraps the Claude CLI workflow skill in a visual dashboard. Preact + Vite renderer, Canvas-based mascot stage, hidden PTY execution.

## Dev Cycle
1. **Plan** — Planning subagent produces `memory-bank/plans/phase-*-detail.md`
2. **Tasks** — Break plan into discrete agent tasks
3. **Agents** — Dispatch coding agents in worktrees (never nested)
4. **Review** — Verify quality gates on main after merge
5. **Merge** — `git merge --no-ff` with conventional commit message

## Core Rules
- **Delegate**: Orchestrator plans, subagents code
- **TDD**: Write failing tests first, then implement, then refactor
- **Worktrees**: All coding in isolated worktrees, clean up after merge
- **Conventional commits**: `type(scope): description` — scopes: `dashboard`, `bridge`, `clawd`, `launch`, `presearch`, `build-ui`, `skills`, `polish`
- **Memory bank**: Update after every phase merge
- **PRESEARCH.md is the Central Authority** — all decisions reference back to it

## Quality Gates
```bash
npx vitest run                    # Unit + component tests
npx eslint src/ --ext .js,.jsx    # Lint
```

## Auto-Merge Conditions
- All quality gates pass (lint + typecheck + tests)
- No unresolved merge conflicts
- Conventional commit message format

## Tech Stack
- **Shell**: Electron (main process, Node.js)
- **Renderer**: Preact + preact/compat via Vite
- **Canvas**: Vanilla JS for Claw'd stage (30fps)
- **Terminal**: node-pty (hidden, no xterm.js in v2)
- **CSS**: CSS Modules or vanilla CSS with custom properties
- **Testing**: Vitest + @testing-library/preact
- **Bundler**: Vite with preact/compat alias

## Skills Reference
| Skill | Purpose |
|-------|---------|
| `/commit` | Conventional commit with project scopes |
| `/pr` | Branch naming, PR template |
| `/tdd-workflow` | Red-green-refactor cycle |
| `/code-quality` | Lint, test, typecheck commands |
| `/decision-log` | ADR format in `decisions/` |
| `/memory-bank` | Session start protocol, 6-file structure |

## File Structure
```
src/
  components/     # Preact UI components (JSX)
  hooks/          # Custom Preact hooks
  bridge/         # Main process: parser, runner, event-bus, forge-log
  clawd/          # Canvas: stage renderer, mascot, helpers, sprites
  styles/         # CSS theme and globals
  assets/         # Sprites, fonts
test/             # Vitest tests mirroring src/ structure
memory-bank/      # Cross-session persistence
decisions/        # Architecture Decision Records
```
