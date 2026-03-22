import { render, screen, fireEvent } from '@testing-library/preact';
import { RegistryCard } from '../../src/components/presearch/RegistryCard';

const mockRequirements = [
  { id: 'R-001', text: 'User login', priority: 'Must-have', phase: 1 },
  { id: 'R-002', text: 'Dark mode', priority: 'Should-have', phase: null },
  { id: 'R-003', text: 'Notifications', priority: 'Cut', phase: null },
];

test('renders title', () => {
  render(<RegistryCard requirements={mockRequirements} onConfirm={() => {}} />);
  expect(screen.getByText('Requirements Registry')).toBeTruthy();
});

test('shows mapped count', () => {
  render(<RegistryCard requirements={mockRequirements} onConfirm={() => {}} />);
  expect(screen.getByText('1/3 mapped')).toBeTruthy();
});

test('renders all requirement ids', () => {
  render(<RegistryCard requirements={mockRequirements} onConfirm={() => {}} />);
  expect(screen.getByText('R-001')).toBeTruthy();
  expect(screen.getByText('R-002')).toBeTruthy();
  expect(screen.getByText('R-003')).toBeTruthy();
});

test('shows priority badges', () => {
  render(<RegistryCard requirements={mockRequirements} onConfirm={() => {}} />);
  expect(screen.getByText('Must-have')).toBeTruthy();
  expect(screen.getByText('Should-have')).toBeTruthy();
  expect(screen.getByText('Cut')).toBeTruthy();
});

test('calls onConfirm when confirm button clicked', () => {
  const onConfirm = vi.fn();
  render(<RegistryCard requirements={mockRequirements} onConfirm={onConfirm} />);
  fireEvent.click(screen.getByText('Confirm Registry'));
  expect(onConfirm).toHaveBeenCalled();
});

test('shows checked/unchecked marks', () => {
  render(<RegistryCard requirements={mockRequirements} onConfirm={() => {}} />);
  expect(screen.getByText('\u2611')).toBeTruthy(); // checked
  expect(screen.getAllByText('\u2610')).toHaveLength(2); // unchecked
});
