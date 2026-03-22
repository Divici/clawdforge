import { render } from '@testing-library/preact';
import { Card } from '../../src/components/shared/Card';

test('renders children', () => {
  const { getByText } = render(<Card>Hello</Card>);
  expect(getByText('Hello')).toBeTruthy();
});

test('applies card class', () => {
  const { container } = render(<Card>X</Card>);
  expect(container.querySelector('.card')).toBeTruthy();
});

test('merges custom className', () => {
  const { container } = render(<Card className="custom">X</Card>);
  const el = container.querySelector('.card');
  expect(el.classList.contains('custom')).toBe(true);
});
