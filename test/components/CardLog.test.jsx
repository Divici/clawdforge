import { render, screen, fireEvent } from '@testing-library/preact';
import { CardLog } from '../../src/components/build/CardLog';

test('renders children', () => {
  render(<CardLog><div>Card 1</div><div>Card 2</div></CardLog>);
  expect(screen.getByText('Card 1')).toBeTruthy();
  expect(screen.getByText('Card 2')).toBeTruthy();
});

test('has scrollable container', () => {
  const { container } = render(<CardLog><div>Test</div></CardLog>);
  expect(container.querySelector('.card-log')).toBeTruthy();
});

test('has content wrapper inside container', () => {
  const { container } = render(<CardLog><div>Test</div></CardLog>);
  expect(container.querySelector('.card-log__content')).toBeTruthy();
});

test('jump button is hidden by default (at bottom)', () => {
  const { container } = render(<CardLog><div>Test</div></CardLog>);
  expect(container.querySelector('.card-log__jump')).toBeNull();
});
