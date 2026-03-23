import { render, screen, act } from '@testing-library/preact';
import { LoadingStatus } from '../../src/components/LoadingStatus';

test('renders loading status with a message', () => {
  render(<LoadingStatus />);
  const container = document.querySelector('.loading-status');
  expect(container).toBeTruthy();
  expect(container.querySelector('.loading-status__dot')).toBeTruthy();
  expect(container.querySelector('.loading-status__text')).toBeTruthy();
  expect(container.querySelector('.loading-status__text').textContent.length).toBeGreaterThan(0);
});

test('renders prefix when provided', () => {
  render(<LoadingStatus prefix="Working on Constraints" />);
  expect(screen.getByText('Working on Constraints')).toBeTruthy();
});

test('does not render prefix element when not provided', () => {
  render(<LoadingStatus />);
  expect(document.querySelector('.loading-status__prefix')).toBeNull();
});

test('cycles to next message after interval', async () => {
  vi.useFakeTimers();
  render(<LoadingStatus interval={1000} />);
  const getText = () => document.querySelector('.loading-status__text').textContent;
  const first = getText();

  // Advance past the fade-out (interval) + fade-in (300ms)
  act(() => { vi.advanceTimersByTime(1000); });
  act(() => { vi.advanceTimersByTime(300); });
  const second = getText();

  expect(second).not.toBe(first);
  vi.useRealTimers();
});
