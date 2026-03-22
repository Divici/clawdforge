import { renderHook, act } from '@testing-library/preact';
import { useElapsedTimer } from '../../src/hooks/useElapsedTimer';

test('starts at 0', () => {
  const { result } = renderHook(() => useElapsedTimer(false));
  expect(result.current).toBe(0);
});

test('increments when running', async () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useElapsedTimer(true));

  act(() => { vi.advanceTimersByTime(3000); });
  expect(result.current).toBe(3);

  vi.useRealTimers();
});

test('stops incrementing when not running', async () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(
    ({ running }) => useElapsedTimer(running),
    { initialProps: { running: true } }
  );

  act(() => { vi.advanceTimersByTime(2000); });
  expect(result.current).toBe(2);

  rerender({ running: false });
  act(() => { vi.advanceTimersByTime(3000); });
  expect(result.current).toBe(2); // Should not increase

  vi.useRealTimers();
});
