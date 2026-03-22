import { render, fireEvent } from '@testing-library/preact';
import { Button } from '../../src/components/shared/Button';

test('renders children', () => {
  const { getByText } = render(<Button>Click me</Button>);
  expect(getByText('Click me')).toBeTruthy();
});

test('applies primary variant by default', () => {
  const { container } = render(<Button>X</Button>);
  expect(container.querySelector('.btn--primary')).toBeTruthy();
});

test('applies secondary variant', () => {
  const { container } = render(<Button variant="secondary">X</Button>);
  expect(container.querySelector('.btn--secondary')).toBeTruthy();
});

test('fires onClick', () => {
  const fn = vi.fn();
  const { getByText } = render(<Button onClick={fn}>Go</Button>);
  fireEvent.click(getByText('Go'));
  expect(fn).toHaveBeenCalledTimes(1);
});

test('does not fire onClick when disabled', () => {
  const fn = vi.fn();
  const { getByText } = render(<Button onClick={fn} disabled>Go</Button>);
  fireEvent.click(getByText('Go'));
  expect(fn).not.toHaveBeenCalled();
});

test('sets disabled attribute', () => {
  const { container } = render(<Button disabled>X</Button>);
  expect(container.querySelector('button').disabled).toBe(true);
});
