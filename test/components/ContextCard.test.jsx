import { render, screen, fireEvent } from '@testing-library/preact';
import { ContextCard } from '../../src/components/build/ContextCard';

test('renders context limit warning label', () => {
  render(<ContextCard phase="auth" taskProgress="4/6 tasks" onResume={() => {}} />);
  expect(screen.getByText('Context Limit Warning')).toBeTruthy();
});

test('renders context reaching limit description', () => {
  render(<ContextCard phase="auth" taskProgress="4/6 tasks" onResume={() => {}} />);
  expect(screen.getByText(/Context reaching limit/)).toBeTruthy();
});

test('shows current phase info', () => {
  render(<ContextCard phase="auth" taskProgress="4/6 tasks" onResume={() => {}} />);
  expect(screen.getByText(/auth \(4\/6 tasks\)/)).toBeTruthy();
});

test('shows state saved message', () => {
  render(<ContextCard phase="auth" taskProgress="4/6" onResume={() => {}} />);
  expect(screen.getByText(/State saved to WORKFLOW_STATE.md/)).toBeTruthy();
});

test('fires onResume callback on button click', () => {
  const onResume = vi.fn();
  render(<ContextCard phase="auth" taskProgress="4/6" onResume={onResume} />);
  fireEvent.click(screen.getByText('Clear & Resume'));
  expect(onResume).toHaveBeenCalled();
});
