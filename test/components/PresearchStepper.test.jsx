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

test('renders phase header and step count', () => {
  render(<PresearchStepper currentLoop={3} completedLoops={[1, 2]} />);
  expect(screen.getByText('System Initialization Phase')).toBeTruthy();
  expect(screen.getByText('Step 03 / 05')).toBeTruthy();
});

test('marks current segment as active', () => {
  const { container } = render(<PresearchStepper currentLoop={2} completedLoops={[]} />);
  const segments = container.querySelectorAll('.presearch-stepper__segment');
  expect(segments[1].classList.contains('presearch-stepper__segment--active')).toBe(true);
});

test('marks completed segments', () => {
  const { container } = render(<PresearchStepper currentLoop={3} completedLoops={[1, 2]} />);
  const segments = container.querySelectorAll('.presearch-stepper__segment');
  expect(segments[0].classList.contains('presearch-stepper__segment--complete')).toBe(true);
  expect(segments[1].classList.contains('presearch-stepper__segment--complete')).toBe(true);
  expect(segments[2].classList.contains('presearch-stepper__segment--active')).toBe(true);
});

test('marks future segments', () => {
  const { container } = render(<PresearchStepper currentLoop={1} completedLoops={[]} />);
  const segments = container.querySelectorAll('.presearch-stepper__segment');
  expect(segments[3].classList.contains('presearch-stepper__segment--future')).toBe(true);
  expect(segments[4].classList.contains('presearch-stepper__segment--future')).toBe(true);
});

test('active label gets active class', () => {
  const { container } = render(<PresearchStepper currentLoop={2} completedLoops={[]} />);
  const labels = container.querySelectorAll('.presearch-stepper__label');
  expect(labels[1].classList.contains('presearch-stepper__label--active')).toBe(true);
});
