# Software Factory — Architecture Analysis

**Repo**: https://github.com/SebastianGarces/software-factory
**What it does**: Takes a feature spec → produces a deployable PR, fully autonomously.

---

## How It Works (High Level)

1. User provides a feature spec (JSON, markdown, or plain text)
2. A bash orchestrator (`factory-runner.sh`) drives 8 sequential phases
3. Each phase runs a specialized Claude agent in an isolated `claude -p` session
4. Agents communicate through disk artifacts in `.factory/artifacts/` — no shared sessions
5. Quality gates after each phase validate output before advancing
6. If gates fail, the phase retries (max 5 iterations, then force-advances)
7. At the end, a PR is created with full context

**Total time**: 4 hours max hard stop. Zero human intervention until final PR review.

---

## The Two-Layer Architecture

### Layer 1: Bash Orchestrator (`scripts/factory-runner.sh` — 43KB)
The heart of the system. A single bash script that:
- Manages the 8-phase state machine
- Enforces quality gates between phases
- Handles retries, reroutes, and cycle detection
- Monitors agent health via heartbeat (kills stale processes)
- Updates `.factory/state.json` atomically (temp file + mv)

### Layer 2: Six Specialized Claude Agents
Each agent runs as a separate `claude -p` session with its own system prompt and tool restrictions:

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| **Orchestrator** | Opus | Full access | Intake + PR assembly |
| **Researcher** | Sonnet | Read-only (Glob, Grep, Read) | Codebase analysis |
| **Designer** | Opus | Pencil MCP only | UI design (optional) |
| **Architect** | Opus | Read-only | Technical design + planning |
| **Implementer** | Sonnet | Full write (worktrees) | TDD coding |
| **Reviewer** | Sonnet | Read + Bash (tests) | Quality verification |

Key insight: **agents never share sessions**. They communicate exclusively through files in `.factory/artifacts/`.

---

## The 8 Phases

### 1. Intake (Orchestrator)
- Normalizes the spec into `spec.json`
- Creates a git branch
- Initializes `.factory/` directory

### 2. Research (Researcher)
- Maps codebase structure, conventions, and patterns
- Documents coding standards with actual file paths (auto-fails if generic)
- Identifies integration points and constraints
- Output: `research.md`

### 3. Design (Designer) — *Optional*
- Creates UI mockups via Pencil MCP
- Generates design tokens (colors, typography, spacing)
- Maps screens to requirements
- Output: `.pen` file, `design-system.md`, `design-manifest.json`, screenshots

### 4. Architecture (Architect)
- Designs data models, API contracts, component hierarchies
- Specifies security requirements, Makefile design
- Key principle: "MATCH the codebase" — replicate existing patterns
- Output: `architecture.md`

### 5. Planning (Architect continued)
- Decomposes architecture into ordered tasks with dependencies
- Creates a DAG (directed acyclic graph) of task dependencies
- Writes acceptance criteria and TDD specs per task
- Output: `plan.md`

### 6. Implementation (Implementer)
- Executes tasks in topological order
- Strict TDD: failing test → minimal code → refactor
- Runs full test/lint/TS suite after each task
- Can request reroute if architectural gaps detected
- Output: working code + task completion reports

### 7. Verification (Reviewer)
- Runs test suites, linters, type checkers
- Validates code against architecture specs
- Checks convention compliance vs research findings
- Never modifies code — feedback only
- Output: `review.md` with PASS/FAIL verdict

### 8. PR Assembly (Orchestrator)
- Creates comprehensive PR description
- Generates QA documentation
- Creates PR on target branch

---

## Quality Gates

After each phase, a quality gate runs (`.claude/hooks/gate-check.sh`). If the gate fails:

1. Phase retries with specific feedback
2. If 3 identical failures → force advance (logged in `decisions.md`)
3. If 5 total iterations → force advance (safeguard)

This prevents infinite loops while maintaining quality.

### Gate Criteria by Phase

| Phase | Must Have |
|-------|----------|
| Research | Actual file paths (not generic), conventions with examples |
| Design | All required screens designed, design system documented |
| Architecture | Data model, API contracts, component hierarchy |
| Planning | Task IDs, dependency graph, acceptance criteria, TDD specs |
| Implementation | All tests pass, lint clean, all tasks complete |
| Verification | PASS verdict, no failures |

---

## Rerouting

The most interesting mechanism. If the Implementer detects an architectural gap:
1. Writes `.factory/reroute.json` with the issue
2. Runner resets Architecture phase to pending
3. Architect re-runs with implementer's feedback
4. Max 5 reroute iterations

This creates a feedback loop where implementation problems flow back to design.

---

## State Management

**`.factory/state.json`** tracks everything:
```json
{
  "phases": {
    "intake": { "status": "completed", "iterations": 1 },
    "research": { "status": "completed", "iterations": 1 },
    "implementation": { "status": "in_progress", "tasks_total": 12, "tasks_completed": 5 }
  },
  "gates": {
    "research": { "passed": true, "feedback": "..." }
  },
  "reroutes": [...],
  "cycle_detection": { "implementation": 0 }
}
```

**`.factory/artifacts/`** holds all inter-agent artifacts:
- `spec.json`, `research.md`, `architecture.md`, `plan.md`, `review.md`
- `task-1.md`, `task-2.md`, ... (completion reports)
- `decisions.md` (forced decisions from gate overrides)

---

## Resilience

- **API retry**: Exponential backoff for 500/529 errors, up to 5 attempts
- **Staleness detection**: Watchdog kills processes with no output for 3-7 minutes
- **Wall-clock timeouts**: 1 hour per phase, 4 hours total
- **Heartbeat**: `.factory/heartbeat` file updated each phase, monitored by watchdog
- **Atomic state updates**: Writes to temp file then `mv` to prevent corruption

---

## Monitoring Tools

| Script | Purpose | Usage |
|--------|---------|-------|
| `factory-watch.sh` | Live dashboard (refreshes 3s) | Run in split terminal pane |
| `factory-tail.sh` | Real-time activity stream (tool calls, thinking) | Live log |
| `factory-status.sh` | One-shot status snapshot | Quick check |
| `factory-heartbeat.sh` | Watchdog — kills stale processes | Runs alongside |

---

## File Structure

```
software-factory/
├── .claude/
│   ├── settings.json            # Enables experimental agent teams
│   ├── agents/                  # 6 agent definitions (AGENT.md each)
│   ├── hooks/gate-check.sh      # Quality gate validator
│   └── skills/                  # 6 skill definitions (SKILL.md each)
├── scripts/
│   ├── factory-runner.sh        # Main orchestrator (43KB — the brain)
│   ├── factory-watch.sh         # Live dashboard
│   ├── factory-tail.sh          # Activity stream
│   ├── factory-status.sh        # Status snapshot
│   ├── factory-heartbeat.sh     # Watchdog
│   ├── factory-install.sh       # macOS launchd service
│   └── ci-simulate.sh           # Unified CI runner
└── templates/
    ├── spec-schema.json         # Feature spec schema
    ├── state.json               # State template
    └── gate-criteria.md         # Gate specs
```

---

## Key Differences from Claw'd Forge

| Aspect | Software Factory | Claw'd Forge |
|--------|-----------------|--------------|
| **Interface** | Terminal-based (bash scripts) | Electron GUI with Preact dashboard |
| **Orchestration** | Bash script (`factory-runner.sh`) | Claude CLI workflow skill |
| **Agent isolation** | Separate `claude -p` sessions per phase | Single Claude session |
| **Communication** | Disk artifacts (`.factory/artifacts/`) | Event bus + IPC |
| **State** | JSON state file + artifacts | In-memory Preact state + forge-log.json |
| **Quality gates** | Bash hook (`gate-check.sh`) | Manual (user reviews in dashboard) |
| **Rerouting** | Automatic (implementation → architecture loop) | Not implemented |
| **Design** | Pencil MCP integration | N/A |
| **Monitoring** | Multiple bash scripts (watch, tail, status) | Built into GUI |
| **Resilience** | Watchdog, heartbeat, exponential backoff | Basic PTY monitoring |
| **Human intervention** | Zero until PR review | Interactive during presearch |

---

## What Makes It Work

1. **Separation of concerns**: Each agent has ONE job with restricted tools
2. **Disk-based communication**: No session state leakage between agents
3. **Quality gates**: Prevent garbage from flowing to the next phase
4. **Rerouting**: Implementation feedback flows back to architecture
5. **Resilience**: Multiple layers of timeout/retry/recovery
6. **Bash orchestration**: Simple, reliable, no runtime dependencies

The 43KB `factory-runner.sh` is impressive — it's essentially a process manager, state machine, and monitoring system in pure bash.
