import { render, screen, fireEvent } from '@testing-library/preact';
import { TextCard } from '../../src/components/presearch/TextCard';

test('renders question text', () => {
  render(<TextCard id="q1" question="What timeline?" onSubmit={() => {}} />);
  expect(screen.getByText('What timeline?')).toBeTruthy();
});

test('submit button disabled when empty', () => {
  render(<TextCard id="q1" question="What timeline?" onSubmit={() => {}} />);
  expect(screen.getByText('Submit Response').disabled).toBe(true);
});

test('calls onSubmit with text', () => {
  const onSubmit = vi.fn();
  render(<TextCard id="q1" question="What timeline?" onSubmit={onSubmit} />);
  const textarea = screen.getByPlaceholderText('Type your answer...');
  fireEvent.input(textarea, { target: { value: '2 weeks' } });
  fireEvent.click(screen.getByText('Submit Response'));
  expect(onSubmit).toHaveBeenCalledWith('q1', '2 weeks');
});

test('trims whitespace before submitting', () => {
  const onSubmit = vi.fn();
  render(<TextCard id="q1" question="What timeline?" onSubmit={onSubmit} />);
  const textarea = screen.getByPlaceholderText('Type your answer...');
  fireEvent.input(textarea, { target: { value: '  spaced  ' } });
  fireEvent.click(screen.getByText('Submit Response'));
  expect(onSubmit).toHaveBeenCalledWith('q1', 'spaced');
});

test('submit button remains disabled for whitespace-only input', () => {
  render(<TextCard id="q1" question="What timeline?" onSubmit={() => {}} />);
  const textarea = screen.getByPlaceholderText('Type your answer...');
  fireEvent.input(textarea, { target: { value: '   ' } });
  expect(screen.getByText('Submit Response').disabled).toBe(true);
});
