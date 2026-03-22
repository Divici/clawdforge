import { render, screen } from '@testing-library/preact';
import { App } from '../../src/App';

test('renders 2-zone layout', () => {
  const { container } = render(<App />);
  const layout = container.querySelector('.app-layout');
  expect(layout).toBeTruthy();
  expect(layout.querySelector('.app-layout__dashboard')).toBeTruthy();
  expect(layout.querySelector('.app-layout__stage')).toBeTruthy();
  expect(layout.querySelector('.grain-overlay')).toBeTruthy();
});

test('dashboard zone shows launch screen by default', () => {
  render(<App />);
  expect(screen.getByText('Start Forge')).toBeTruthy();
});

test('stage zone contains canvas', () => {
  const { container } = render(<App />);
  const stage = container.querySelector('.app-layout__stage');
  const canvas = stage.querySelector('canvas');
  expect(canvas).toBeTruthy();
});
