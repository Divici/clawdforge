import { render, screen } from '@testing-library/preact';
import { PresearchStepper } from '../../src/components/presearch/PresearchStepper';

test('renders all 5 loop names', () => {
  render(<PresearchStepper currentLoop={1} completedLoops={[]} />);
  expect(screen.getByText('Constraints')).toBeTruthy();
  expect(screen.getByText('Discovery')).toBeTruthy();
  expect(screen.getByText('Refinement')).toBeTruthy();
  expect(screen.getByText('Plan')).toBeTruthy();
  expect(screen.getByText('Gap Analysis')).toBeTruthy();
});

test('marks current loop as active', () => {
  const { container } = render(<PresearchStepper currentLoop={2} completedLoops={[]} />);
  const steps = container.querySelectorAll('.presearch-stepper__step');
  expect(steps[1].classList.contains('presearch-stepper__step--active')).toBe(true);
});

test('marks completed loops with checkmark', () => {
  const { container } = render(<PresearchStepper currentLoop={3} completedLoops={[1, 2]} />);
  const dots = container.querySelectorAll('.presearch-stepper__dot');
  expect(dots[0].textContent).toBe('\u2713');
  expect(dots[1].textContent).toBe('\u2713');
  expect(dots[2].textContent).toBe('\u25CF');
});

test('does not mark non-active non-complete loops as active', () => {
  const { container } = render(<PresearchStepper currentLoop={1} completedLoops={[]} />);
  const steps = container.querySelectorAll('.presearch-stepper__step');
  expect(steps[2].classList.contains('presearch-stepper__step--active')).toBe(false);
  expect(steps[2].classList.contains('presearch-stepper__step--complete')).toBe(false);
});

test('pending loops show empty circle', () => {
  const { container } = render(<PresearchStepper currentLoop={1} completedLoops={[]} />);
  const dots = container.querySelectorAll('.presearch-stepper__dot');
  expect(dots[4].textContent).toBe('\u25CB');
});
