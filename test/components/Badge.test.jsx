import { render } from '@testing-library/preact';
import { Badge } from '../../src/components/shared/Badge';

test('renders with default variant', () => {
  const { container } = render(<Badge>Tag</Badge>);
  expect(container.querySelector('.badge--default')).toBeTruthy();
});

test('renders success variant', () => {
  const { container } = render(<Badge variant="success">OK</Badge>);
  expect(container.querySelector('.badge--success')).toBeTruthy();
});

test('renders error variant', () => {
  const { container } = render(<Badge variant="error">Fail</Badge>);
  expect(container.querySelector('.badge--error')).toBeTruthy();
});

test('renders warning variant', () => {
  const { container } = render(<Badge variant="warning">Warn</Badge>);
  expect(container.querySelector('.badge--warning')).toBeTruthy();
});

test('renders children text', () => {
  const { getByText } = render(<Badge>Label</Badge>);
  expect(getByText('Label')).toBeTruthy();
});
