import { render, screen } from '@testing-library/preact';
import { RequirementsPanel } from '../../src/components/presearch/RequirementsPanel';

const mockRequirements = [
  { id: 'R-001', text: 'User login', priority: 'Must-have', phase: 1 },
  { id: 'R-002', text: 'Dark mode', priority: 'Should-have', phase: null },
];

test('renders nothing when no requirements', () => {
  const { container } = render(<RequirementsPanel requirements={[]} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when requirements is null', () => {
  const { container } = render(<RequirementsPanel requirements={null} />);
  expect(container.innerHTML).toBe('');
});

test('renders heading', () => {
  render(<RequirementsPanel requirements={mockRequirements} />);
  expect(screen.getByText('Requirements Checklist')).toBeTruthy();
});

test('renders requirement texts', () => {
  render(<RequirementsPanel requirements={mockRequirements} />);
  expect(screen.getByText('User login')).toBeTruthy();
  expect(screen.getByText('Dark mode')).toBeTruthy();
});

test('shows checked mark for completed requirements', () => {
  render(<RequirementsPanel requirements={mockRequirements} />);
  expect(screen.getByText('\u2611')).toBeTruthy();
  expect(screen.getByText('\u2610')).toBeTruthy();
});

test('shows verified status for completed and pending for incomplete', () => {
  render(<RequirementsPanel requirements={mockRequirements} />);
  expect(screen.getByText('Status: Verified')).toBeTruthy();
  expect(screen.getByText('Status: Pending Selection')).toBeTruthy();
});
