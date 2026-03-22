# Memory Bank Skill — Claw'd Forge

## 6-File Structure (`memory-bank/`)

| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `project-brief.md` | Scope, goals, requirements | Rarely (at start) |
| `product-context.md` | Problem, solution, users, UX | Rarely |
| `system-patterns.md` | Architecture, components, patterns | After structural changes |
| `tech-context.md` | Stack, deps, deployment, constraints | After dep changes |
| `active-context.md` | Current phase, just completed, next | After every phase |
| `progress.md` | Done, remaining, known issues | After every phase |

## Session Start Protocol
1. Read all 6 memory bank files
2. Read `PRESEARCH.md` for current authority
3. Read `WORKFLOW_STATE.md` for build progress
4. Check `decisions/` for recent ADRs

## Update Triggers
- **Phase complete**: Update `active-context.md` and `progress.md`
- **Architecture change**: Update `system-patterns.md`
- **New dependency**: Update `tech-context.md`
- **Spec revision**: Update `project-brief.md` if scope changed

## Plans Directory
Phase-specific plans go in `memory-bank/plans/`:
- `phase-scaffold-detail.md`
- `phase-bridge-detail.md`
- etc.
