# Claw'd Forge — v2 PRD

## Overview

Claw'd Forge (formerly Matrix Forge) is a standalone desktop app that wraps the Claude CLI workflow skill in a visual dashboard. v2 replaces the terminal-centric experience with an iOS-friendly interactive dashboard where users never need to touch a terminal. The Claw'd mascot (an orange lobster) provides personality and visual progress feedback through costumes and animations tied to each workflow phase.

It is not meant to replace the workflow. It is the user-facing layer on top of real Claude CLI execution — but in v2, the terminal is invisible and the dashboard is the sole interface.

## Core Goal

A polished, approachable dashboard that makes the workflow skill feel like a product, not a CLI wrapper. It should be:

- **Friendly and scannable** — iOS-level clarity, not power-user density
- **Interactive during presearch** — structured cards, not terminal typing
- **Informative during build** — progress at a glance, detail on demand
- **Personality-driven** — Claw'd gives the process a face and emotional feedback
- **Tied to real execution** — not a mock or demo

The app should feel like a smart assistant dashboard, not a game and not a developer tool.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Shell | Electron | Wraps to `.exe`, spawns Claude CLI via `node-pty`, handles IPC |
| Dashboard | DOM (vanilla JS) | Cards, steppers, forms — DOM is natural for this, no framework needed |
| Claw'd Stage | HTML5 Canvas | Sprite animation needs pixel-level control |
| Terminal | node-pty (hidden) | Still runs Claude CLI underneath, but output is parsed, not displayed |
| Layout | CSS Grid | 2-zone stacked layout |
| Packaging | electron-builder | Produces single `.exe` with icon |

No React. No UI frameworks. Vanilla JS + Canvas for Claw'd only.

---

## Visual Style

Claude-branded warm palette, replacing the Matrix green theme.

| Role | Color | Usage |
|------|-------|-------|
| **Background** | `#1A1A2E` | App background, deep charcoal |
| **Surface** | `#252540` | Card backgrounds, elevated surfaces |
| **Surface Hover** | `#2E2E4A` | Card hover states |
| **Primary (Orange)** | `#E07A4B` | Claw'd, active states, primary buttons, progress indicators |
| **Primary Dim** | `#B85E3A` | Orange pressed/inactive states |
| **Cream** | `#F5E6D3` | Primary text, headings |
| **Tan** | `#D4A574` | Secondary text, labels, borders |
| **Tan Dim** | `#8B7355` | Tertiary text, placeholders |
| **Success** | `#5BAE6B` | Completed states, passing quality gates, locked decisions |
| **Error** | `#E85555` | Failures, blockers, error states |
| **Warning** | `#E8B84B` | Warnings, context threshold alerts |

**Typography:**
- **Headings/brand**: `"Press Start 2P"` (pixel font — retained for personality)
- **Body/data**: `"JetBrains Mono"` or `"Fira Code"` (monospace for technical feel)
- **UI text**: System sans-serif as fallback for card body text if readability demands it

**No CRT overlay.** The warm palette and clean card UI replaces the retro-terminal aesthetic. The pixel font on headings retains enough personality.

**Final palette will be refined via Google Stitch** during implementation — generate a design system screen first and extract exact tokens.

---

## Layout

2-zone stacked layout. No side panels.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   DASHBOARD                          │
│              (full width, flex: 1)                    │
│                                                      │
│  Contextual content: launch / presearch / build      │
│                                                      │
│                                                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  CLAW'D STAGE (full width, fixed 180px)              │
│  [canvas — mascot animation, subagent helpers]       │
└──────────────────────────────────────────────────────┘
```

Default window size: 1400x800. Resizable. Dashboard reflows cards, Claw'd stage canvas redraws on resize.

---

## Dashboard — Three Modes

The dashboard is a single DOM container that swaps content based on the current workflow mode. A header bar persists across all modes.

### Persistent Header Bar

Always visible at the top of the dashboard:

```
┌──────────────────────────────────────────────────────┐
│  🦞 CLAW'D FORGE    ProjectName    ⏱ 12:34    ⏸    │
└──────────────────────────────────────────────────────┘
```

| Element | Details |
|---------|---------|
| Logo/Title | "CLAW'D FORGE" in pixel font, small |
| Project Name | Set at launch, displayed in cream |
| Elapsed Timer | Starts on forge launch, ticks every second |
| Pause Button | Only visible during build mode (see Pause/Resume section) |

Status counters (active agents, decisions locked, artifacts created, warnings) display **contextually within the card area** rather than in the header — they appear as badges on the stepper or within cards where relevant.

---

### Mode 1: Launch Screen

Displayed on app open. Full-dashboard overlay.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               🦞 CLAW'D FORGE                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Project Directory                       [📁] │    │
│  │ C:\Users\...\my-project                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ How would you like to start?                 │    │
│  │                                              │    │
│  │  ○ Use a PRD file                            │    │
│  │    [dropdown: prd.md, brief.md, spec.md]     │    │
│  │                                              │    │
│  │  ○ Describe your project                     │    │
│  │    ┌──────────────────────────────────────┐  │    │
│  │    │ Multi-line text area for project     │  │    │
│  │    │ description...                       │  │    │
│  │    └──────────────────────────────────────┘  │    │
│  │                                              │    │
│  │  ○ Resume existing workflow                  │    │  ← conditional
│  │    Phase 3/5 — api-core (paused)             │    │
│  │    Last active: 2 hours ago                  │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│              [ Start Forge ]                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- On directory selection, scan for PRD files (`*prd*`, `*brief*`, `*spec*`, `*requirements*`) and populate dropdown
- Also scan for `WORKFLOW_STATE.md` — if found, show resume option with phase info and last modified time
- "Start Forge" spawns Claude CLI with the appropriate initial input:
  - PRD mode: sends `/workflow` followed by PRD path
  - Description mode: sends `/workflow` followed by the description text
  - Resume mode: sends `resume` (workflow skill handles the rest)
- Claw'd in the stage below waves and looks around (idle animation)

---

### Mode 2: Presearch (Interactive Wizard)

The dashboard renders Claude's presearch questions as structured UI cards. A stepper bar at the top shows progress through the 5 presearch loops.

#### Presearch Stepper

Compact, always visible at top of dashboard during presearch:

```
┌──────────────────────────────────────────────────────┐
│  ● Constraints  ○ Discovery  ○ Refinement  ○ Plan  ○ Gap Analysis │
└──────────────────────────────────────────────────────┘
```

- Current step filled/highlighted in orange
- Completed steps show checkmark in success green
- Tapping a completed step expands a read-only summary of locked decisions from that loop
- If AI Deep Dive (Loop 1.5) triggers, it appears as a sub-step under Constraints

#### Card Types

All presearch interaction happens through cards rendered in the dashboard. Cards stack vertically and auto-scroll as new ones appear.

**Question Card:**
```
┌──────────────────────────────────────────────────────┐
│  What database should we use?                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ ★ SQLite                              [Select] │  │  ← recommended
│  │   ✓ Zero config, embedded                      │  │    expanded
│  │   ✓ Perfect for single-user desktop app        │  │
│  │   ✗ No concurrent write support                │  │
│  │   Best when: single user, local-first          │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │   PostgreSQL                                ▸  │  │  ← collapsed
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │   MongoDB                                   ▸  │  │  ← collapsed
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │   Other...                                  ▸  │  │  ← expands to
│  └────────────────────────────────────────────────┘  │    text input
└──────────────────────────────────────────────────────┘
```

- Claude's recommended option expanded by default with full pros/cons
- Other options collapsed — tap to expand and see pros/cons
- Checkmarks (✓) in success green, X marks (✗) in tan dim
- "Best when" one-liner in tan as a plain-English tiebreaker
- "★ Recommended" badge on Claude's pick
- "Select" button on each expanded option
- "Other..." expands to a text input (Cursor-chat style)
- On select → option highlights in success green, card collapses to locked summary, response sent to Claude stdin

**Accordion Card (for AI Deep Dive / nested decisions):**
```
┌──────────────────────────────────────────────────────┐
│  AI Approach                                    1/4  │
│                                                      │
│  ▼ Pattern Selection                                 │  ← expanded section
│    [Question card UI with options...]                │
│                                                      │
│  ▶ RAG Strategy                              locked  │  ← collapsed, shows
│  ▶ Model Selection                                   │    only after prior
│  ▶ Eval Strategy                                     │    section decided
│  ▶ Guardrails                                        │
└──────────────────────────────────────────────────────┘
```

- Sections cascade: selecting RAG in "Pattern Selection" reveals "RAG Strategy"
- Each section uses the same option-card UI internally
- Completed sections collapse to show locked choice as a one-line summary
- Counter "1/4" shows progress through sub-sections

**Requirements Registry Card:**
```
┌──────────────────────────────────────────────────────┐
│  Requirements Registry                    12/15 mapped│
│                                                      │
│  ☑ R-001  User authentication with OAuth    Must-have │
│  ☑ R-002  Dashboard with real-time updates  Must-have │
│  ☑ R-003  REST API for CRUD operations      Must-have │
│  ☐ R-004  Email notifications               Should    │
│  ☐ R-005  Export to PDF                     Cut ✕     │
│  ...                                                 │
│                                                      │
│  [Confirm Registry]                                  │
└──────────────────────────────────────────────────────┘
```

- Checklist with priority badges
- Tap a requirement to edit priority (Must-have / Should-have / Cut)
- Swipe or tap "✕" to mark as Cut (prompts for reason)
- Coverage badge "12/15 mapped" updates as roadmap phases assign R-IDs
- Drag to reorder priority (stretch goal for v2)

**Decision Lock Card:**
```
┌──────────────────────────────────────────────────────┐
│  ✓ Database: SQLite                          locked  │
│    Embedded, zero-config, fits single-user scope     │
│                                       [Change ↩]     │
└──────────────────────────────────────────────────────┘
```

- Green checkmark, compact summary
- "Change" link to reopen the decision (discouraged but available)
- Appears after each selection, then scrolls up as new cards arrive

**Open-Ended Question Card:**

For questions without predefined options (e.g., "What's the project timeline?"):

```
┌──────────────────────────────────────────────────────┐
│  What's your timeline for shipping?                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ 2 weeks, need MVP by March 30                │    │
│  └──────────────────────────────────────────────┘    │
│                                            [Submit]  │
└──────────────────────────────────────────────────────┘
```

- Simple text input with submit button
- Enter key submits (Shift+Enter for newline)

#### Presearch → Stdin Translation

When the user interacts with a card:
1. Dashboard captures the selection (e.g., "SQLite")
2. Translates to natural language text (e.g., "I'll go with SQLite")
3. Sends to Claude's stdin via IPC
4. Claude processes the response and emits the next structured marker

---

### Mode 3: Build (Autonomous Dashboard)

The dashboard switches to a progress-tracking view. The user is passive unless intervention is needed.

#### Build Stepper

Horizontal stepper at top, visually distinct from presearch stepper (wider step indicators, phase names from the roadmap):

```
┌──────────────────────────────────────────────────────┐
│  ● scaffold ──── ● auth ──── ○ api-core ──── ○ deploy ──── ○ polish │
│  ✓ complete    ✓ complete    ◉ in progress                          │
└──────────────────────────────────────────────────────┘
```

- Completed phases: success green with checkmark
- Active phase: orange filled circle, pulsing gently
- Future phases: dim outline circles
- Phase names from PRESEARCH.md roadmap
- Horizontal line connecting all phases
- Below each active/completed phase: brief status text

**Status counters** display as inline badges on the stepper:
```
Agents: 3 active  │  Decisions: 12  │  Tests: 47 passing  │  Artifacts: 23
```

#### Card Log

Below the stepper, a vertically scrolling log of cards representing completed work units (commits, agent tasks, phase reviews).

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ◉ scaffold database models           2:34 ago│    │  ← most recent
│  │   feat(db): add user and project models       │    │    expanded
│  │                                               │    │
│  │   Files changed:                              │    │
│  │   + src/models/user.ts                        │    │
│  │   + src/models/project.ts                     │    │
│  │   + src/migrations/001_initial.ts             │    │
│  │                                               │    │
│  │   Tests: 8 added, 8 passing ✓                 │    │
│  │   Quality gates: lint ✓  typecheck ✓  test ✓  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ✓ bootstrap project structure         5:12 ago│   │  ← collapsed
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ✓ phase plan: scaffold                8:01 ago│   │  ← collapsed
│  └──────────────────────────────────────────────┘    │
│                                                      │
│                              [ ↓ Jump to latest ]    │  ← only when
│                                                      │    scrolled up
└──────────────────────────────────────────────────────┘
```

**Card content (expanded):**
- Commit message or task description
- Files changed (abbreviated list, expandable)
- Test count delta (tests added this task)
- Quality gate status (lint/typecheck/test — green check or red X)
- Timestamp (relative)
- Requirements satisfied (R-IDs, if phase review card)

**Scroll behavior:**
- Auto-scrolls to show latest card as new ones appear
- If user scrolls up, auto-scroll stops
- "Jump to latest" button appears when scrolled up
- Clicking "Jump to latest" re-enables auto-scroll

**Card types in the build log:**
- **Task card** — individual agent task completion (commit)
- **Phase plan card** — planning subagent output summary
- **Phase review card** — phase completion with requirements checklist
- **Spec revision card** — PRESEARCH.md was updated (shows diff)

#### Intervention Cards

These slide in at the top of the card log when user action is needed. They have a distinct visual treatment (orange border, Claw'd attention indicator).

**Blocker Card:**
```
┌─── ⚠ ──────────────────────────────────────────────┐
│  Blocker: OpenAI API key required                    │
│                                                      │
│  The build needs an API key to continue.             │
│                                                      │
│  ▸ What was tried (3 approaches)                     │  ← collapsed
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Paste API key here...                        │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [Submit Key]  [Skip & Use Mock]  [Skip for Now]     │
└──────────────────────────────────────────────────────┘
```

**Context Handoff Card:**
```
┌─── ⚠ ──────────────────────────────────────────────┐
│  Context reaching limit — save point reached         │
│                                                      │
│  Current phase: api-core (task 3/7 complete)         │
│  State saved to WORKFLOW_STATE.md                    │
│                                                      │
│  [Clear & Resume]                                    │
└──────────────────────────────────────────────────────┘
```

**Agent Failure Card:**
```
┌─── ✗ ──────────────────────────────────────────────┐
│  Task failed: setup auth middleware                  │
│  Failed after 2 retries + 1 alternative approach     │
│                                                      │
│  ▸ Error details                                     │  ← collapsed
│                                                      │
│  [Retry with instructions]  [Skip task]  [Pause]     │
└──────────────────────────────────────────────────────┘
```

---

### Pause / Resume

**Pause button** lives in the header bar, visible only during build mode.

**On pause:**
1. Claude finishes current atomic unit (current agent task completes and merges)
2. State written to `WORKFLOW_STATE.md` and `memory-bank/active-context.md`
3. Dashboard shows paused state:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              ⏸ Build Paused                          │
│              after: scaffold phase, task 4/6          │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Instructions for Claude (optional):          │    │
│  │ ┌──────────────────────────────────────────┐ │    │
│  │ │ Switch auth from next-auth to Clerk,     │ │    │
│  │ │ update the presearch accordingly         │ │    │
│  │ └──────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [▶ Resume Build]                                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

4. On resume, queued instructions (if any) are sent to Claude stdin before continuing
5. Claw'd sits down with a coffee cup during pause (idle-paused costume)

**On app close during build:**
- Same state files are written (WORKFLOW_STATE.md is kept current at phase boundaries)
- On next app launch, directory scan detects WORKFLOW_STATE.md
- Launch screen shows "Resume existing workflow" option
- Resume path is identical to pause-resume

---

### Mode 4: Completion

When all phases finish:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              ✓ Build Complete                         │
│                                                      │
│  Phases completed: 5/5                               │
│  Tests passing: 127                                  │
│  Quality gates: all green                            │
│  Time elapsed: 1:23:45                               │
│                                                      │
│  Deployed: https://my-app.railway.app                │
│                                                      │
│  Known issues:                                       │
│  - PDF export not implemented (R-015, cut)            │
│  - Mobile responsive needs polish                    │
│                                                      │
│  [View Full Card Log]  [Open Project]  [New Project] │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Claw'd wears a party hat and celebrates in the stage below.

---

## Claw'd Stage

A horizontal canvas strip (full width, 180px tall) pinned to the bottom of the window.

### Canvas Layout

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   [helper]  [helper]   🦞 CLAW'D   [helper]          │
│                        (centered)                    │
│                                                      │
│   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   │  ← ground line
└──────────────────────────────────────────────────────┘
```

- **Claw'd** is centered, ~96x96 sprite (scaled for 180px height with padding)
- **Ground line** at ~80% height — a subtle horizontal line Claw'd stands on
- **Subagent helpers** are mini-Claw'ds (~48x48) that walk in from the right when spawned and walk off when done
- **Background** matches the app surface color, possibly with a very subtle pattern or gradient

### Render Loop

30fps via `requestAnimationFrame` with frame throttling (retained from v1).

### Claw'd Costumes

Each phase has a costume (sprite sheet variant). Claw'd changes costume on `mode:change` and `stage:change` events.

| Phase | Costume | Idle Animation |
|-------|---------|----------------|
| Launch / Idle | Base Claw'd (orange lobster) | Waving, looking around |
| Presearch — Constraints | Detective hat, magnifying glass | Examining, tapping chin |
| Presearch — Discovery | Hard hat, blueprint roll | Pointing at plans |
| Presearch — Refinement | Lab coat, safety goggles | Shaking flask |
| Presearch — Planning | Clipboard, pencil behind ear | Writing, checking boxes |
| Presearch — Gap Analysis | Red pen, critic glasses | Scrutinizing |
| Build — Bootstrap | Construction hat, hammer | Building motion |
| Build — Planning | Whistle, coach hat | Calling in helpers |
| Build — Executing | Foreman vest | Directing helpers |
| Build — Review | Magnifying glass (reused) | Inspecting |
| Deploy | Rocket pack, launch goggles | Countdown pose |
| Complete | Party hat, confetti | Celebrating |
| Error | Cracked hard hat, bandage | Dizzy stars |
| Paused | Sitting on chair, coffee cup | Sipping, relaxing |

**Sprite format:** Horizontal sprite sheets, one per costume. Frame size TBD based on AI generation output (target ~96x96 per frame, 4-8 frames per costume for idle loop).

**Costume transitions:** Quick fade-out (200ms) → swap sheet → fade-in (200ms).

### Subagent Helpers

- Mini-Claw'ds (~48x48) — simplified version of main Claw'd, no costume
- Walk in from right edge when `agent:spawn` event fires
- Stand in a row, slight bob animation while working
- Walk off to the left when `agent:done` fires
- Max 6 visible on screen + badge count if more
- On error: helper turns red and falls over (simple 2-frame animation)

---

## Bridge — Structured Marker Protocol

### The Core Challenge

v1 used regex to detect events from Claude's freeform output. v2 needs to extract **structured questions, options, and comparison tables** to render as UI cards. Freeform parsing won't work reliably.

### Solution: Forge Output Protocol

Modify the workflow/presearch/build skill files to emit structured markers that the stage parser can extract. Markers are mixed into Claude's normal output — they're parsed and consumed by the app, never displayed to the user.

**Marker format:**

```
[FORGE:TYPE key=value key=value] content
```

**Marker types:**

| Marker | Purpose | Payload |
|--------|---------|---------|
| `[FORGE:QUESTION id=q1]` | Start a question card | Question text follows on same line |
| `[FORGE:OPTION id=q1 recommended=true]` | An option for a question | Option name `\|` pros/cons text |
| `[FORGE:OPTION_END id=q1]` | End of options for a question | (none) |
| `[FORGE:TEXT_QUESTION id=q2]` | Open-ended question (text input) | Question text |
| `[FORGE:ACCORDION id=a1 sections=4]` | Start accordion group | Group title |
| `[FORGE:ACCORDION_SECTION id=a1 section=1]` | Start a section within accordion | Section title |
| `[FORGE:REGISTRY]` | Requirements registry follows | JSON array of requirements |
| `[FORGE:DECISION]` | Decision locked | Decision summary text |
| `[FORGE:LOOP loop=1 name=Constraints]` | Loop/phase transition | Loop number and name |
| `[FORGE:MODE mode=build]` | Mode change | Mode name |
| `[FORGE:PHASE phase=scaffold total=5 current=1]` | Build phase change | Phase details |
| `[FORGE:TASK status=complete]` | Task completed | Commit message, files, test count |
| `[FORGE:BLOCKER type=api-key]` | External blocker | Description, what was tried |
| `[FORGE:CONTEXT_WARNING pct=48]` | Context threshold | Percentage used |
| `[FORGE:AGENT_SPAWN count=3]` | Subagent spawned | Current active count |
| `[FORGE:AGENT_DONE count=2]` | Subagent completed | Current active count |
| `[FORGE:COMPLETE]` | Build finished | Summary JSON |

### Parser Changes

The stage parser (`stage-parser.js`) needs two modes:
1. **Structured mode** — extract `[FORGE:*]` markers, parse key-value pairs, emit typed events with structured payloads
2. **Fallback mode** — if no markers detected (e.g., skill files not updated), fall back to v1 regex patterns for basic event detection

Structured mode is primary. Fallback ensures the app still works (degraded) with unmodified skills.

### Stdin Translation

When the user interacts with a dashboard card, the response is translated to text and sent to Claude's PTY stdin:

| User Action | Stdin Text |
|-------------|-----------|
| Select option "SQLite" | `I'll go with SQLite` |
| Select recommended option | `I'll go with the recommended option: [name]` |
| Type custom answer | `[exact user text]` |
| Confirm registry | `The requirements registry looks good, let's proceed` |
| Submit API key | `Here's the API key: [key]` |
| Choose "Skip & Use Mock" | `Let's skip this and use a mock for now` |
| Pause build | `Please pause after the current task completes` |
| Resume with instructions | `[user instructions]. Resume building.` |

### Event Bus

Same pub/sub pattern as v1, but events now carry richer payloads:

```
stage-parser → event-bus → dashboard (card rendering)
                         → clawd-stage (costume/animation changes)
                         → forge-log (persistence)
```

---

## Persistence — forge-log.json

A JSON file written alongside `WORKFLOW_STATE.md` that stores the card log so the dashboard can be reconstructed on resume.

```json
{
  "projectName": "my-project",
  "startTime": "2026-03-21T10:00:00Z",
  "mode": "build",
  "presearchDecisions": [
    { "id": "q1", "question": "Database?", "answer": "SQLite", "loop": 2 }
  ],
  "buildCards": [
    {
      "type": "task",
      "title": "bootstrap project structure",
      "commit": "chore: bootstrap project structure",
      "files": [".claude/CLAUDE.md", "..."],
      "tests": { "added": 0, "passing": 0 },
      "qualityGates": { "lint": true, "typecheck": true, "test": true },
      "timestamp": "2026-03-21T10:05:00Z",
      "phase": "bootstrap"
    }
  ],
  "currentPhase": "scaffold",
  "totalPhases": 5,
  "phaseNames": ["scaffold", "auth", "api-core", "deploy", "polish"]
}
```

- Written after every card event
- Read on resume to populate the dashboard with history
- Added to `.gitignore`

---

## Application Flow

### Launch

1. User opens Claw'd Forge
2. Launch screen appears — Claw'd waves in the stage below
3. User selects project directory
4. App scans for PRD files and WORKFLOW_STATE.md
5. User chooses start method (PRD / description / resume)
6. "Start Forge" → Claude CLI spawns via hidden PTY
7. Dashboard transitions to presearch or build mode (based on resume state)

### During Presearch

1. Claude runs `/workflow`, enters presearch
2. Claude emits `[FORGE:LOOP]` markers at each loop transition
3. Claude emits `[FORGE:QUESTION]` + `[FORGE:OPTION]` markers for each question
4. Dashboard renders question cards
5. User selects options or types answers
6. Responses sent to Claude stdin
7. Claude processes and emits next question
8. Claw'd changes costume at each loop transition
9. Stepper advances as loops complete
10. After Loop 5, presearch locks and mode transitions to build

### During Build

1. Claude enters autonomous build mode
2. Dashboard switches to build layout (phase stepper + card log)
3. `[FORGE:PHASE]` markers update the stepper
4. `[FORGE:TASK]` markers create cards in the log
5. `[FORGE:AGENT_SPAWN/DONE]` markers animate helpers in Claw'd stage
6. Cards auto-scroll unless user has scrolled up
7. Intervention cards appear at top if blockers/failures
8. User can pause at any time via header button
9. `[FORGE:COMPLETE]` triggers completion screen

### On Close

1. If mid-presearch: progress is lost (presearch is conversational, can't easily persist mid-loop — user is warned)
2. If mid-build: WORKFLOW_STATE.md and forge-log.json are current — resume is safe
3. If paused: state already saved — resume on next launch

### On Resume

1. Launch screen detects WORKFLOW_STATE.md
2. Shows "Resume" option with phase info
3. On resume, forge-log.json populates the card log with history
4. Claude picks up from next incomplete phase
5. Claw'd puts on the appropriate costume for the current phase

---

## File Structure

```
clawd-forge/
├── package.json
├── electron-builder.yml
├── forge.ico
├── main.js                          # Electron main process
├── preload.js                       # IPC bridge (contextBridge)
├── launch.js                        # ELECTRON_RUN_AS_NODE workaround
├── vitest.config.mjs
│
├── src/
│   ├── index.html                   # 2-zone layout shell
│   ├── styles/
│   │   └── forge.css                # Full theme, layout, card styles, animations
│   │
│   ├── bridge/
│   │   ├── claude-runner.js         # Spawns Claude CLI via node-pty (hidden)
│   │   ├── stage-parser.js          # Structured marker parser + regex fallback
│   │   ├── patterns.json            # Fallback regex patterns (v1 compat)
│   │   ├── event-bus.js             # Pub/sub EventEmitter
│   │   └── forge-log.js             # Persistence: read/write forge-log.json
│   │
│   ├── dashboard/
│   │   ├── dashboard.js             # Mode switcher (launch / presearch / build / complete)
│   │   ├── launch-screen.js         # Directory picker, PRD/description input, resume detect
│   │   ├── header-bar.js            # Persistent header: title, project, timer, pause
│   │   ├── presearch/
│   │   │   ├── presearch-wizard.js  # Presearch mode orchestrator
│   │   │   ├── stepper.js           # 5-loop progress stepper
│   │   │   ├── question-card.js     # Option selection card with pros/cons
│   │   │   ├── accordion-card.js    # Nested decision groups (AI deep dive)
│   │   │   ├── registry-card.js     # Requirements registry checklist
│   │   │   ├── decision-card.js     # Locked decision confirmation
│   │   │   └── text-card.js         # Open-ended text input card
│   │   └── build/
│   │       ├── build-dashboard.js   # Build mode orchestrator
│   │       ├── phase-stepper.js     # Horizontal phase progress (distinct from presearch)
│   │       ├── card-log.js          # Scrollable card log with auto-scroll
│   │       ├── task-card.js         # Completed task/commit card
│   │       ├── blocker-card.js      # Intervention: blocker requiring user input
│   │       ├── failure-card.js      # Intervention: agent failure
│   │       ├── context-card.js      # Intervention: context handoff warning
│   │       ├── pause-screen.js      # Paused state with instruction input
│   │       └── completion-screen.js # Final summary
│   │
│   ├── clawd/
│   │   ├── stage-renderer.js        # 30fps canvas loop for Claw'd stage
│   │   ├── clawd-mascot.js          # Main Claw'd: costume management, animation
│   │   ├── helpers.js               # Mini-Claw'd subagent sprites
│   │   └── sprites.js               # Sprite sheet loader, frame management
│   │
│   └── assets/
│       ├── sprites/
│       │   ├── clawd-idle.png        # Base Claw'd sprite sheet
│       │   ├── clawd-detective.png   # Constraints costume
│       │   ├── clawd-architect.png   # Discovery costume
│       │   ├── clawd-scientist.png   # Refinement costume
│       │   ├── clawd-planner.png     # Planning costume
│       │   ├── clawd-critic.png      # Gap analysis costume
│       │   ├── clawd-builder.png     # Bootstrap costume
│       │   ├── clawd-coach.png       # Build planning costume
│       │   ├── clawd-foreman.png     # Build executing costume
│       │   ├── clawd-inspector.png   # Build review costume
│       │   ├── clawd-rocket.png      # Deploy costume
│       │   ├── clawd-party.png       # Complete costume
│       │   ├── clawd-error.png       # Error costume
│       │   ├── clawd-coffee.png      # Paused costume
│       │   └── clawd-helper.png      # Mini subagent sprite sheet
│       └── fonts/
│           └── PressStart2P.ttf
│
└── test/
    ├── stage-parser.test.js          # Structured marker parsing tests
    ├── event-bus.test.js             # Pub/sub tests
    ├── forge-log.test.js             # Persistence read/write tests
    ├── dashboard.test.js             # Mode switching tests
    └── card-rendering.test.js        # Card type rendering tests
```

---

## Skill File Modifications

The workflow, presearch, and build skill files need modifications to emit `[FORGE:*]` structured markers. These markers are added to the skill instructions so Claude outputs them naturally alongside its regular output.

### Files to Modify

| File | Changes |
|------|---------|
| `~/.claude/skills/presearch/SKILL.md` | Add marker emission instructions for questions, options, loops, decisions |
| `~/.claude/skills/build/SKILL.md` | Add marker emission instructions for phases, tasks, agents, blockers |
| `~/.claude/skills/workflow/SKILL.md` | Add marker emission for mode transitions, context warnings |

### Marker Emission Rules (added to skill files)

```markdown
## Forge Output Protocol

When running inside Claw'd Forge (detected by FORGE_ENABLED=true env var),
emit structured markers for the dashboard UI. Markers are on their own line
and start with [FORGE:]. They do not replace your normal output — emit them
IN ADDITION to your regular responses.

Example:
[FORGE:QUESTION id=q1] What database should we use?
[FORGE:OPTION id=q1] PostgreSQL | ✓ Mature, relational, great for complex queries | ✓ Strong ecosystem | ✗ Requires server setup | ✗ Overkill for simple apps | Best when: complex queries, multiple tables with relationships
[FORGE:OPTION id=q1 recommended=true] SQLite | ✓ Zero config, embedded | ✓ Perfect for single-user | ✗ No concurrent writes | ✗ Limited to 281 TB | Best when: single user, local-first, simple data
[FORGE:OPTION_END id=q1]
```

The env var `FORGE_ENABLED=true` is set by the Electron app when spawning Claude, so markers are only emitted when running inside Claw'd Forge.

---

## Build Order (v2)

### Phase 1 — Layout & Theme
1. Update `index.html` to 2-zone stacked layout (dashboard + 180px stage)
2. New `forge.css` with Claude brand palette
3. Remove CRT overlay, Matrix green references
4. Verify: app launches with new layout and warm color scheme

### Phase 2 — Launch Screen
5. Implement `launch-screen.js` — directory picker, PRD dropdown, description textarea
6. Add resume detection (scan for WORKFLOW_STATE.md)
7. Wire to claude-runner spawn
8. Verify: can launch Claude from new UI

### Phase 3 — Structured Marker Parser
9. Design marker format specification
10. Write parser tests for all marker types
11. Implement structured parser in `stage-parser.js` with regex fallback
12. Verify: parser extracts markers from sample output

### Phase 4 — Presearch Wizard
13. Implement `presearch-wizard.js` — mode orchestrator
14. Implement card types: question, accordion, registry, decision, text
15. Implement presearch stepper
16. Wire card interactions → stdin translation → Claude
17. Verify: full presearch loop works through dashboard cards

### Phase 5 — Build Dashboard
18. Implement `build-dashboard.js` — mode orchestrator
19. Implement phase stepper (visually distinct from presearch)
20. Implement card log with auto-scroll behavior
21. Implement task cards, intervention cards
22. Wire to forge events
23. Verify: build progress displays correctly with card log

### Phase 6 — Pause / Resume
24. Implement pause button in header bar
25. Implement pause screen with instruction input
26. Implement stdin injection on resume
27. Wire forge-log.json persistence
28. Verify: pause, type instruction, resume works end-to-end

### Phase 7 — Claw'd Stage
29. Set up 180px canvas with stage-renderer.js
30. Implement clawd-mascot.js with costume swapping
31. Implement helpers.js for subagent mini-Claw'ds
32. Create placeholder sprites (rectangles) for all costumes
33. Wire to forge events for costume/helper changes
34. Verify: Claw'd changes costume on phase transitions, helpers appear/disappear

### Phase 8 — Skill File Modifications
35. Add Forge Output Protocol section to presearch SKILL.md
36. Add Forge Output Protocol section to build SKILL.md
37. Add Forge Output Protocol section to workflow SKILL.md
38. Add FORGE_ENABLED env var to claude-runner.js spawn
39. Test end-to-end with modified skills

### Phase 9 — Completion & Polish
40. Implement completion screen
41. Replace placeholder sprites with AI-generated Claw'd sprites
42. Responsive resize handling
43. Stitch design system generation for final palette refinement
44. Window title, icon updates (rebrand to Claw'd Forge)

### Phase 10 — Package
45. Update electron-builder.yml with new name/icon
46. Build `.exe`
47. Test on clean machine
48. Rename repo references from Matrix Forge to Claw'd Forge

---

## Non-Goals (v2)

- No sound effects
- No multi-project support (one project at a time)
- No settings UI
- No Claw'd reactions to user actions (costume changes only on phase events)
- No drag-to-reorder in requirements registry (tap to change priority only)
- No terminal access (fully abstracted away)
- No offline/local LLM support

## Future (v3+)

- Claw'd reactions to user actions (nods, thumbs up, head shake)
- Sound effects (costume change whoosh, task complete chime, celebration)
- Terminal debug drawer (hidden, accessible via keyboard shortcut for debugging)
- Session history / replay
- Multiple project tabs
- Custom Claw'd skins/costumes
- Mobile companion app (read-only progress view)
