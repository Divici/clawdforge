# Decision Log Skill — Claw'd Forge

## Format
Create files in `decisions/` directory with sequential numbering:

```markdown
# NNNN — Decision Title

## Status
Accepted | Revised | Superseded by NNNN

## Context
What is the issue that we're seeing that motivates this decision?

## Decision
What is the change that we're proposing/doing?

## Alternatives Considered
- Alternative A: why rejected
- Alternative B: why rejected

## Consequences
- Positive: what improves
- Negative: what gets harder
- Risks: what could go wrong

## References
- PRESEARCH.md section: [section name]
- Requirements: R-XXX
```

## When to Create
- Bootstrap decisions (0001)
- Spec revisions during build (`[REVISED - Phase N]` markers)
- Technology changes or significant architectural shifts
- Any decision that future developers would ask "why?"
