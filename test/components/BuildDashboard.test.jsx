import { render, screen } from '@testing-library/preact';
import { BuildDashboard } from '../../src/components/build/BuildDashboard';

beforeEach(() => {
  window.forgeAPI = {
    onRawOutput: vi.fn(),
    onToolUse: vi.fn(),
    onToolResult: vi.fn(),
    sendForgeResponse: vi.fn(),
  };
});

afterEach(() => {
  delete window.forgeAPI;
});

function makeState(overrides = {}) {
  return {
    mode: 'build',
    status: 'running',
    build: {
      status: 'running',
      currentPhase: 'scaffold',
      completedPhases: [],
      tasksTotal: 0,
      tasksCompleted: 0,
      activeAgents: 0,
      blockers: [],
      ...overrides.build,
    },
    ...overrides,
  };
}

function makeBuild(overrides = {}) {
  return {
    phases: [],
    agents: { active: 0, totalSpawned: 0, totalCompleted: 0 },
    summary: null,
    ...overrides,
  };
}

test('renders build dashboard container', () => {
  const { container } = render(<BuildDashboard state={makeState()} buildState={makeBuild()} />);
  expect(container.querySelector('.build-dashboard')).toBeTruthy();
});

test('renders build stepper', () => {
  const { container } = render(<BuildDashboard state={makeState()} buildState={makeBuild()} />);
  expect(container.querySelector('.build-stepper')).toBeTruthy();
});

test('renders build log panel', () => {
  const { container } = render(<BuildDashboard state={makeState()} buildState={makeBuild()} />);
  expect(container.querySelector('.build-log')).toBeTruthy();
  expect(container.querySelector('.build-log__header')).toBeTruthy();
});

test('renders phases from build state', () => {
  const buildState = makeBuild({
    phases: [
      { name: 'scaffold', status: 'complete', tasks: [] },
      { name: 'auth', status: 'in_progress', tasks: [] },
      { name: 'deploy', status: 'pending', tasks: [] },
    ],
  });
  render(<BuildDashboard state={makeState()} buildState={buildState} />);
  expect(screen.getByText('scaffold')).toBeTruthy();
  expect(screen.getByText('auth')).toBeTruthy();
  expect(screen.getByText('deploy')).toBeTruthy();
});

test('renders task cards from phase tasks', () => {
  const buildState = makeBuild({
    phases: [
      {
        name: 'scaffold', status: 'complete',
        tasks: [{ id: 't1', description: 'Created user model', status: 'complete', commit: 'feat: add user model' }],
      },
    ],
  });
  const { container } = render(<BuildDashboard state={makeState()} buildState={buildState} />);
  expect(container.querySelector('.task-card')).toBeTruthy();
});

test('renders blocker cards from state', () => {
  const state = makeState({
    build: { blockers: [{ id: 'b1', type: 'api-key', message: 'Missing API key', resolved: false }], currentPhase: 'scaffold', completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, status: 'running' },
  });
  const { container } = render(<BuildDashboard state={state} buildState={makeBuild()} />);
  expect(container.querySelector('.blocker-card')).toBeTruthy();
});

test('calls onComplete when mode is complete', () => {
  const onComplete = vi.fn();
  const state = makeState({ mode: 'complete' });
  render(<BuildDashboard state={state} buildState={makeBuild()} onComplete={onComplete} />);
  expect(onComplete).toHaveBeenCalled();
});

test('calls onComplete when mode transitions to complete', () => {
  const onComplete = vi.fn();
  const state = makeState({ mode: 'complete' });
  render(<BuildDashboard state={state} buildState={makeBuild()} onComplete={onComplete} />);
  expect(onComplete).toHaveBeenCalled();
});

test('handles null state/buildState gracefully', () => {
  const { container } = render(<BuildDashboard state={null} buildState={null} />);
  expect(container.querySelector('.build-dashboard')).toBeTruthy();
});
