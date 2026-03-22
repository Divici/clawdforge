import { render, screen, fireEvent } from '@testing-library/preact';
import { QuestionCard } from '../../src/components/presearch/QuestionCard';

const mockOptions = [
  { name: 'SQLite', pros: ['Zero config'], cons: ['No concurrent writes'], bestWhen: 'single user', recommended: true },
  { name: 'PostgreSQL', pros: ['Mature'], cons: ['Requires server'], bestWhen: 'complex queries' },
];

test('renders question text', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('What database?')).toBeTruthy();
});

test('shows recommended badge on recommended option', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('\u2605 Recommended')).toBeTruthy();
});

test('shows pros and cons for expanded option', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('\u2713 Zero config')).toBeTruthy();
  expect(screen.getByText('\u2717 No concurrent writes')).toBeTruthy();
});

test('calls onSelect when Select button clicked', () => {
  const onSelect = vi.fn();
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Select'));
  expect(onSelect).toHaveBeenCalledWith('q1', mockOptions[0]);
});

test('shows Other... option', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('Other...')).toBeTruthy();
});

test('expands other option and allows custom input', () => {
  const onSelect = vi.fn();
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Other...'));
  const input = screen.getByPlaceholderText('Type your answer...');
  fireEvent.input(input, { target: { value: 'MongoDB' } });
  fireEvent.click(screen.getAllByText('Select')[0]);
  expect(onSelect).toHaveBeenCalledWith('q1', { name: 'MongoDB', custom: true });
});

test('expanding another option collapses current', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  // Initially SQLite (recommended) is expanded
  expect(screen.getByText('\u2713 Zero config')).toBeTruthy();
  // Click PostgreSQL
  fireEvent.click(screen.getByText('PostgreSQL'));
  expect(screen.getByText('\u2713 Mature')).toBeTruthy();
  expect(screen.queryByText('\u2713 Zero config')).toBeNull();
});
