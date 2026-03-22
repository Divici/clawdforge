import { render, screen, act } from '@testing-library/preact';
import { BuildDashboard } from '../../src/components/build/BuildDashboard';

let forgeEventCallback;

beforeEach(() => {
  forgeEventCallback = null;
  window.forgeAPI = {
    onForgeEvent: (cb) => { forgeEventCallback = cb; },
    sendForgeResponse: vi.fn(),
  };
});

afterEach(() => {
  delete window.forgeAPI;
});

test('renders build dashboard container', () => {
  const { container } = render(<BuildDashboard />);
  expect(container.querySelector('.build-dashboard')).toBeTruthy();
});

test('renders phase stepper', () => {
  const { container } = render(<BuildDashboard />);
  expect(container.querySelector('.phase-stepper')).toBeTruthy();
});

test('renders build log panel', () => {
  const { container } = render(<BuildDashboard />);
  expect(container.querySelector('.build-log')).toBeTruthy();
  expect(container.querySelector('.build-log__header')).toBeTruthy();
});

test('handles forge:phase event to set phases', () => {
  render(<BuildDashboard />);
  act(() => {
    forgeEventCallback({ type: 'forge:phase', phase: 'scaffold', phaseNames: ['scaffold', 'auth', 'deploy'] });
  });
  expect(screen.getByText('scaffold')).toBeTruthy();
  expect(screen.getByText('auth')).toBeTruthy();
  expect(screen.getByText('deploy')).toBeTruthy();
});

test('handles forge:task event to add task card', () => {
  const { container } = render(<BuildDashboard />);
  act(() => {
    forgeEventCallback({ type: 'forge:task', content: 'Created user model' });
  });
  expect(container.querySelector('.task-card__title').textContent).toBe('Created user model');
});

test('handles forge:blocker event to add blocker card', () => {
  const { container } = render(<BuildDashboard />);
  act(() => {
    forgeEventCallback({ type: 'forge:blocker', content: 'Missing API key' });
  });
  expect(container.querySelector('.blocker-card')).toBeTruthy();
  expect(screen.getByText('Intervention Required')).toBeTruthy();
  expect(container.querySelector('.blocker-card__desc').textContent).toContain('Missing API key');
});

test('handles forge:complete event to show completion screen', () => {
  render(<BuildDashboard />);
  act(() => {
    forgeEventCallback({ type: 'forge:complete', summary: { tests: 42 } });
  });
  expect(screen.getByText(/Forge Completion/)).toBeTruthy();
  expect(screen.getByText('42')).toBeTruthy();
});

test('calls onComplete callback on forge:complete', () => {
  const onComplete = vi.fn();
  render(<BuildDashboard onComplete={onComplete} />);
  act(() => {
    forgeEventCallback({ type: 'forge:complete', summary: {} });
  });
  expect(onComplete).toHaveBeenCalled();
});
