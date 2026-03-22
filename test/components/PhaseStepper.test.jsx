import { render, screen } from '@testing-library/preact';
import { PhaseStepper } from '../../src/components/build/PhaseStepper';

test('renders phase names', () => {
  render(<PhaseStepper phases={['scaffold', 'auth']} currentPhase="scaffold" completedPhases={[]} />);
  expect(screen.getByText('scaffold')).toBeTruthy();
  expect(screen.getByText('auth')).toBeTruthy();
});

test('marks current phase as active', () => {
  const { container } = render(<PhaseStepper phases={['scaffold', 'auth']} currentPhase="auth" completedPhases={[]} />);
  const dots = container.querySelectorAll('.phase-stepper__dot');
  expect(dots[1].classList.contains('phase-stepper__dot--active')).toBe(true);
});

test('marks completed phases with checkmark', () => {
  const { container } = render(<PhaseStepper phases={['scaffold', 'auth']} currentPhase="auth" completedPhases={['scaffold']} />);
  const dots = container.querySelectorAll('.phase-stepper__dot');
  expect(dots[0].textContent).toContain('✓');
});

test('shows "in progress" for current phase', () => {
  render(<PhaseStepper phases={['scaffold', 'auth']} currentPhase="scaffold" completedPhases={[]} />);
  expect(screen.getByText('in progress')).toBeTruthy();
});

test('shows "complete" for completed phases', () => {
  render(<PhaseStepper phases={['scaffold', 'auth']} currentPhase="auth" completedPhases={['scaffold']} />);
  expect(screen.getByText('complete')).toBeTruthy();
});

test('renders stats badges when provided', () => {
  render(<PhaseStepper phases={['a']} currentPhase="a" completedPhases={[]} stats={{ agents: 3, decisions: 12 }} />);
  expect(screen.getByText('Agents: 3')).toBeTruthy();
  expect(screen.getByText('Decisions: 12')).toBeTruthy();
});

test('renders connecting lines between phases', () => {
  const { container } = render(<PhaseStepper phases={['a', 'b', 'c']} currentPhase="b" completedPhases={['a']} />);
  const lines = container.querySelectorAll('.phase-stepper__line');
  expect(lines.length).toBe(2);
});

test('active line class on completed/current phase connectors', () => {
  const { container } = render(<PhaseStepper phases={['a', 'b', 'c']} currentPhase="b" completedPhases={['a']} />);
  const lines = container.querySelectorAll('.phase-stepper__line');
  expect(lines[0].classList.contains('phase-stepper__line--active')).toBe(true);
});

test('does not render stats section when stats is undefined', () => {
  const { container } = render(<PhaseStepper phases={['a']} currentPhase="a" completedPhases={[]} />);
  expect(container.querySelector('.phase-stepper__stats')).toBeNull();
});
