import { render, screen, fireEvent } from '@testing-library/preact';
import { DecisionCard } from '../../src/components/presearch/DecisionCard';

test('renders summary with checkmark', () => {
  render(<DecisionCard summary="Database: SQLite" />);
  expect(screen.getByText('\u2713')).toBeTruthy();
  expect(screen.getByText('Database: SQLite')).toBeTruthy();
});

test('shows Change button when onReopen provided', () => {
  const onReopen = vi.fn();
  render(<DecisionCard summary="Database: SQLite" onReopen={onReopen} />);
  fireEvent.click(screen.getByText('Change \u21A9'));
  expect(onReopen).toHaveBeenCalled();
});

test('hides Change button when no onReopen', () => {
  render(<DecisionCard summary="Database: SQLite" />);
  expect(screen.queryByText('Change \u21A9')).toBeNull();
});
