import { render, screen, fireEvent } from '@testing-library/preact';
import { PresearchWizard } from '../../src/components/presearch/PresearchWizard';

beforeEach(() => {
  window.forgeAPI = {
    sendForgeResponse: vi.fn(),
  };
});

afterEach(() => {
  delete window.forgeAPI;
});

function makeState(overrides = {}) {
  return {
    mode: 'presearch',
    status: 'running',
    runMode: 'autonomous',
    presearch: {
      currentLoop: 1,
      currentLoopName: 'Constraints',
      completedLoops: [],
      totalLoops: 5,
      waitingForInput: false,
      inputRequestId: null,
      ...overrides.presearch,
    },
    ...overrides,
  };
}

function makePresearch(overrides = {}) {
  return {
    requirements: [],
    questions: [],
    decisions: [],
    ...overrides,
  };
}

test('renders stepper with initial state', () => {
  render(<PresearchWizard state={makeState()} presearch={makePresearch()} />);
  expect(screen.getByText('Constraints')).toBeTruthy();
  expect(screen.getByText('Discovery')).toBeTruthy();
});

test('renders thinking indicator when no questions', () => {
  const { container } = render(<PresearchWizard state={makeState()} presearch={makePresearch()} />);
  const thinking = container.querySelector('.presearch-wizard__thinking');
  expect(thinking).toBeTruthy();
  expect(container.querySelector('.loading-status')).toBeTruthy();
});

test('renders two-column layout', () => {
  const { container } = render(<PresearchWizard state={makeState()} presearch={makePresearch()} />);
  expect(container.querySelector('.presearch-wizard__content')).toBeTruthy();
  expect(container.querySelector('.presearch-wizard__left')).toBeTruthy();
  expect(container.querySelector('.presearch-wizard__right')).toBeTruthy();
});

test('renders answered questions as DecisionCards in autonomous mode', () => {
  const presearch = makePresearch({
    questions: [
      {
        id: 'q1', loop: 1, loopName: 'Constraints', type: 'choice',
        question: 'What database?', status: 'answered', answer: 'SQLite',
        options: [{ name: 'SQLite', pros: ['Fast'], cons: ['Limited'], recommended: true }],
      },
    ],
  });
  const { container } = render(<PresearchWizard state={makeState()} presearch={presearch} />);
  expect(container.querySelector('.decision-card')).toBeTruthy();
  expect(screen.getByText(/What database\?.*SQLite/)).toBeTruthy();
});

test('renders pending questions as interactive QuestionCard in interactive mode', () => {
  const state = makeState({ runMode: 'interactive', presearch: { waitingForInput: true, inputRequestId: 'q1', currentLoop: 1, currentLoopName: 'Constraints', completedLoops: [], totalLoops: 5 } });
  const presearch = makePresearch({
    questions: [
      {
        id: 'q1', loop: 1, loopName: 'Constraints', type: 'choice',
        question: 'What database?', status: 'pending', answer: null,
        options: [
          { name: 'SQLite', pros: ['Fast'], cons: ['Limited'], recommended: true },
          { name: 'PostgreSQL', pros: ['Robust'], cons: ['Heavy'], recommended: false },
        ],
      },
    ],
  });
  const { container } = render(<PresearchWizard state={state} presearch={presearch} />);
  expect(container.querySelector('.question-card')).toBeTruthy();
  expect(screen.getByText('What database?')).toBeTruthy();
});

test('renders requirements in right panel', () => {
  const presearch = makePresearch({
    requirements: [
      { id: 'R-001', text: 'Must support offline', priority: 'Must-have' },
    ],
  });
  render(<PresearchWizard state={makeState()} presearch={presearch} />);
  expect(screen.getByText(/Must support offline/)).toBeTruthy();
});

test('renders text questions as TextCard when pending', () => {
  const state = makeState({ runMode: 'interactive', presearch: { waitingForInput: true, inputRequestId: 'q2', currentLoop: 1, currentLoopName: 'Constraints', completedLoops: [], totalLoops: 5 } });
  const presearch = makePresearch({
    questions: [
      { id: 'q2', loop: 1, loopName: 'Constraints', type: 'text', question: 'Project name?', status: 'pending', answer: null, options: [] },
    ],
  });
  const { container } = render(<PresearchWizard state={state} presearch={presearch} />);
  expect(container.querySelector('.text-card')).toBeTruthy();
});

test('handles null state/presearch gracefully', () => {
  const { container } = render(<PresearchWizard state={null} presearch={null} />);
  expect(container.querySelector('.presearch-wizard')).toBeTruthy();
});
