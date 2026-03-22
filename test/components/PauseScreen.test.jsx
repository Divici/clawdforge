import { render, screen, fireEvent } from '@testing-library/preact';
import { PauseScreen } from '../../src/components/build/PauseScreen';

test('renders paused title', () => {
  render(<PauseScreen phase="scaffold" taskProgress="4/6" onResume={() => {}} />);
  expect(screen.getByText(/Build Paused/)).toBeTruthy();
});

test('shows phase info', () => {
  render(<PauseScreen phase="scaffold" taskProgress="4/6" onResume={() => {}} />);
  expect(screen.getByText('after: scaffold, 4/6')).toBeTruthy();
});

test('has instruction textarea', () => {
  render(<PauseScreen phase="scaffold" taskProgress="4/6" onResume={() => {}} />);
  expect(screen.getByPlaceholderText(/changes or instructions/)).toBeTruthy();
});

test('calls onResume with empty string when no instructions', () => {
  const onResume = vi.fn();
  render(<PauseScreen phase="scaffold" taskProgress="4/6" onResume={onResume} />);
  fireEvent.click(screen.getByText(/Resume Build/));
  expect(onResume).toHaveBeenCalledWith('');
});

test('calls onResume with instructions text', () => {
  const onResume = vi.fn();
  render(<PauseScreen phase="scaffold" taskProgress="4/6" onResume={onResume} />);
  const textarea = screen.getByPlaceholderText(/changes or instructions/);
  fireEvent.input(textarea, { target: { value: 'Switch to Clerk' } });
  fireEvent.click(screen.getByText(/Resume Build/));
  expect(onResume).toHaveBeenCalledWith('Switch to Clerk');
});
