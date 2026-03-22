# Phase: scaffold — Detailed Plan

## Tasks
1. CSS Theme + Global Styles (no deps)
2. Preact Entry + App Shell (depends: 1)
3. Shared UI Components (depends: 1, parallel with 2)
4. Claw'd Stage Canvas Placeholder (depends: 2)
5. Electron Integration + Dev Workflow (depends: 2, 4)
6. ESLint Configuration (depends: 1-4)
7. Verify No Matrix Green Remains (depends: all)

## Execution Order
1. Task 1
2. Tasks 2 + 3 in parallel
3. Task 4
4. Tasks 5 + 6 in parallel
5. Task 7

## Requirements Coverage
- R-001: Tasks 1, 2, 4
- R-025: Tasks 1, 7
- R-026: Tasks 2, 5
