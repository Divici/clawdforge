import { render, screen, fireEvent } from '@testing-library/preact';
import { FailureCard } from '../../src/components/build/FailureCard';

test('renders failure title', () => {
  render(<FailureCard title="Auth module failed" retryCount={3} />);
  expect(screen.getByText('Auth module failed')).toBeTruthy();
});

test('shows retry count info', () => {
  render(<FailureCard title="Failed" retryCount={3} />);
  expect(screen.getByText(/Failed after 3 retries/)).toBeTruthy();
});

test('retry button fires callback', () => {
  const onRetry = vi.fn();
  render(<FailureCard title="Failed" retryCount={1} onRetry={onRetry} />);
  fireEvent.click(screen.getByText('Retry with instructions'));
  expect(onRetry).toHaveBeenCalled();
});

test('skip button fires callback', () => {
  const onSkip = vi.fn();
  render(<FailureCard title="Failed" retryCount={1} onSkip={onSkip} />);
  fireEvent.click(screen.getByText('Skip task'));
  expect(onSkip).toHaveBeenCalled();
});

test('pause button fires callback', () => {
  const onPause = vi.fn();
  render(<FailureCard title="Failed" retryCount={1} onPause={onPause} />);
  fireEvent.click(screen.getByText('Pause'));
  expect(onPause).toHaveBeenCalled();
});

test('shows error details toggle', () => {
  render(<FailureCard title="Failed" retryCount={1} errorDetails="TypeError: undefined" />);
  expect(screen.getByText(/Error details/)).toBeTruthy();
});

test('expands error details on click', () => {
  render(<FailureCard title="Failed" retryCount={1} errorDetails="TypeError: undefined" />);
  fireEvent.click(screen.getByText(/Error details/));
  expect(screen.getByText('TypeError: undefined')).toBeTruthy();
});
