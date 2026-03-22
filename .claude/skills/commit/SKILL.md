# Commit Skill — Claw'd Forge

## Format
```
type(scope): short description

Body explaining why (optional for trivial changes).

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Types
- `feat` — new feature or capability
- `fix` — bug fix
- `refactor` — code restructuring, no behavior change
- `test` — adding or updating tests
- `chore` — tooling, config, dependencies
- `docs` — documentation updates
- `style` — formatting, no logic change

## Scopes
- `dashboard` — Preact components, layout, shared UI
- `bridge` — stage-parser, event-bus, claude-runner, forge-log
- `clawd` — canvas stage, mascot, sprites, helpers
- `launch` — launch screen, directory picker
- `presearch` — presearch wizard, cards, stepper
- `build-ui` — build dashboard, card log, intervention cards
- `skills` — skill file modifications
- `polish` — packaging, branding, final refinements

## Rules
- Lowercase start, imperative mood
- Max 72 chars for subject line
- One logical change per commit
- Reference requirement IDs when implementing: `feat(presearch): add question card (R-005)`
