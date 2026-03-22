import { render } from '@testing-library/preact';
import { ClawdStage } from '../../src/clawd/ClawdStage';

test('renders a canvas element', () => {
  const { container } = render(<ClawdStage />);
  const canvas = container.querySelector('canvas');
  expect(canvas).toBeTruthy();
});
