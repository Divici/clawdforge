import { render, screen } from '@testing-library/preact';
import { App } from '../../src/App';

test('renders 2-zone layout', () => {
  const { container } = render(<App />);
  const layout = container.querySelector('.app-layout');
  expect(layout).toBeTruthy();
  expect(layout.children).toHaveLength(2);
  expect(layout.children[0].classList.contains('app-layout__dashboard')).toBe(true);
  expect(layout.children[1].classList.contains('app-layout__stage')).toBe(true);
});

test('dashboard zone contains content', () => {
  render(<App />);
  expect(screen.getByText('Dashboard')).toBeTruthy();
});

test('stage zone contains canvas', () => {
  const { container } = render(<App />);
  const stage = container.querySelector('.app-layout__stage');
  const canvas = stage.querySelector('canvas');
  expect(canvas).toBeTruthy();
});
