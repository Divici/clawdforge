# 0001 — Project Bootstrap: v1 to v2 Transition

## Status
Accepted

## Context
Matrix Forge v1 is a working Electron app with 3-panel layout (status, canvas, terminal), vanilla JS, and CRT aesthetic. v2 redesigns the entire UI as an interactive dashboard with Preact components, hides the terminal, and adds the Claw'd mascot with costumes.

## Decision
- Replace vanilla JS renderer with Preact + Vite
- Replace 3-panel layout with 2-zone stacked layout (dashboard + Claw'd stage)
- Replace CRT/Matrix green aesthetic with Claude brand warm palette
- Replace regex-only parsing with structured `[FORGE:*]` marker protocol
- Hide terminal — user interacts via dashboard cards only
- Retain: Electron shell, node-pty, event-bus architecture, Canvas for mascot stage

## Alternatives Considered
- **Keep v1 and enhance**: Rejected — too many fundamental UX changes needed
- **React instead of Preact**: Rejected — Preact is 3kb, React API via compat, no benefit from full React
- **Tauri instead of Electron**: Rejected — can't run node-pty

## Consequences
- Positive: Modern component-based UI, interactive presearch, visual personality
- Negative: Significant rewrite of renderer, need sprite assets
- Risks: Vite + Electron integration, preact/compat edge cases

## References
- PRESEARCH.md: all sections
- Requirements: R-001 through R-032
