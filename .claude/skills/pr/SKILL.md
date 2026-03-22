# PR Skill — Claw'd Forge

## Branch Naming
```
type/scope-short-description
```
Examples: `feat/presearch-question-cards`, `fix/bridge-marker-parsing`

## PR Template
```markdown
## Summary
- 1-3 bullet points describing the change

## Requirements Addressed
- R-XXX: description

## Test Plan
- [ ] Unit tests added/updated
- [ ] Quality gates pass (vitest, eslint)
- [ ] Manual verification steps

## Screenshots
(if UI changes)
```

## Review Checklist
- [ ] Quality gates pass: `npx vitest run` + `npx eslint src/ --ext .js,.jsx`
- [ ] No console.log left in production code
- [ ] Conventional commit messages
- [ ] PRESEARCH.md requirements addressed
- [ ] Memory bank updated if phase boundary
