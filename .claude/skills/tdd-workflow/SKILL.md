# TDD Workflow Skill — Claw'd Forge

## Cycle: Red -> Green -> Refactor

### 1. Red — Write a Failing Test
```javascript
// test/components/QuestionCard.test.jsx
import { render, screen } from '@testing-library/preact';
import { QuestionCard } from '../../src/components/presearch/QuestionCard';

test('renders question text', () => {
  render(<QuestionCard question="What database?" options={[]} />);
  expect(screen.getByText('What database?')).toBeTruthy();
});
```

Run: `npx vitest run` — confirm it fails for the right reason.

### 2. Green — Minimal Implementation
Write just enough code to make the test pass. No extras.

### 3. Refactor — Clean Up
Improve structure while keeping tests green. Run quality gates:
```bash
npx vitest run
npx eslint src/ --ext .js,.jsx
```

## Coverage by Area
| Area | Test Target |
|------|------------|
| Bridge (stage-parser) | Marker extraction, fallback regex, edge cases |
| Bridge (event-bus) | Pub/sub, listener cleanup |
| Bridge (forge-log) | Read/write/append, corrupt file handling |
| Components | Rendering, interaction, state transitions |
| Integration | Marker → event → card rendering pipeline |
| Canvas (clawd/) | Costume transitions, helper spawn/despawn (unit) |

## Test File Naming
- `test/[module].test.js` for bridge modules
- `test/components/[Component].test.jsx` for Preact components
- `test/integration/[flow].test.js` for integration tests
