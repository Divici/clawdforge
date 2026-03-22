# Product Context — Claw'd Forge v2

## Problem
Claude CLI workflow runs in a terminal — phases, agents, and decisions scroll by with no visual structure. Users can't tell at a glance what phase they're in, what decisions were made, or how many agents are active.

## Solution
A dashboard that renders Claude's workflow output as structured UI cards (questions, options, decisions) during presearch and progress cards during build. The terminal is hidden; the dashboard is the sole interface.

## Target Users
Individual developers using Claude's workflow skill for project generation. Non-power-users who want a friendly, visual interface.

## UX Principles
- **Scannable**: Card-based layout, not dense text
- **Interactive**: Click to select options, not type answers
- **Progressive disclosure**: Cards expand for detail, collapse when done
- **Personality**: Claw'd mascot provides emotional feedback (costumes per phase)
- **Passive during build**: User watches progress, intervenes only on blockers
