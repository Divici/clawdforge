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

test('shows recommended banner on recommended option', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('Recommended Architecture')).toBeTruthy();
});

test('shows pros and cons for expanded option', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('Zero config')).toBeTruthy();
  expect(screen.getByText('No concurrent writes')).toBeTruthy();
});

test('calls onSelect when select button clicked', () => {
  const onSelect = vi.fn();
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Select This Option'));
  expect(onSelect).toHaveBeenCalledWith('q1', mockOptions[0]);
});

test('shows Other... option collapsed', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  expect(screen.getByText('Other...')).toBeTruthy();
});

test('expands other option and allows custom input', () => {
  const onSelect = vi.fn();
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Other...'));
  const input = screen.getByPlaceholderText('Type your answer...');
  fireEvent.input(input, { target: { value: 'MongoDB' } });
  fireEvent.click(screen.getByText('Submit Custom Response'));
  expect(onSelect).toHaveBeenCalledWith('q1', { name: 'MongoDB', custom: true });
});

test('expanding another option collapses current', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  // Initially SQLite (recommended) is expanded
  expect(screen.getByText('Zero config')).toBeTruthy();
  // Click PostgreSQL collapsed row
  fireEvent.click(screen.getByText('PostgreSQL'));
  expect(screen.getByText('Mature')).toBeTruthy();
  expect(screen.queryByText('Zero config')).toBeNull();
});

test('renders collapsed options with number prefix', () => {
  render(<QuestionCard id="q1" question="What database?" options={mockOptions} onSelect={() => {}} />);
  // PostgreSQL is collapsed, should show number "02"
  expect(screen.getByText('02')).toBeTruthy();
});
