import { render, screen, fireEvent } from '@testing-library/preact';
import { HeaderBar } from '../../src/components/HeaderBar';

test('renders logo text', () => {
  render(<HeaderBar projectName="" elapsed={0} mode="launch" />);
  expect(screen.getByText("Claw'd Forge")).toBeTruthy();
});

test('renders project name with prefix', () => {
  render(<HeaderBar projectName="my-project" elapsed={0} mode="launch" />);
  expect(screen.getByText('Project: my-project')).toBeTruthy();
});

test('formats elapsed time as HH:MM:SS', () => {
  render(<HeaderBar projectName="" elapsed={754} mode="launch" />);
  expect(screen.getByText('00:12:34')).toBeTruthy();
});

test('shows pause button in build mode', () => {
  const onPause = vi.fn();
  render(<HeaderBar projectName="" elapsed={0} mode="build" onPause={onPause} />);
  const btn = screen.getByTitle('Pause build');
  expect(btn).toBeTruthy();
  fireEvent.click(btn);
  expect(onPause).toHaveBeenCalledTimes(1);
});

test('hides pause button outside build mode', () => {
  render(<HeaderBar projectName="" elapsed={0} mode="presearch" />);
  expect(screen.queryByTitle('Pause build')).toBeNull();
});
