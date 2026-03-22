import { render, screen, fireEvent } from '@testing-library/preact';
import { TaskCard } from '../../src/components/build/TaskCard';

test('renders title', () => {
  render(<TaskCard title="scaffold db models" />);
  expect(screen.getByText('scaffold db models')).toBeTruthy();
});

test('collapsed by default', () => {
  render(<TaskCard title="scaffold" commit="feat(db): add models" />);
  expect(screen.queryByText('feat(db): add models')).toBeNull();
});

test('expands on click to show commit', () => {
  render(<TaskCard title="scaffold" commit="feat(db): add models" />);
  fireEvent.click(screen.getByText('scaffold'));
  expect(screen.getByText('feat(db): add models')).toBeTruthy();
});

test('initially expanded when prop set', () => {
  render(<TaskCard title="scaffold" commit="feat(db): add models" expanded={true} />);
  expect(screen.getByText('feat(db): add models')).toBeTruthy();
});

test('shows files when expanded', () => {
  render(<TaskCard title="scaffold" expanded={true} files={['src/db.js', 'src/models.js']} />);
  expect(screen.getByText('+ src/db.js')).toBeTruthy();
  expect(screen.getByText('+ src/models.js')).toBeTruthy();
});

test('shows quality gates when expanded', () => {
  render(<TaskCard title="scaffold" expanded={true} qualityGates={{ lint: true, test: true }} />);
  expect(screen.getByText(/lint ✓/)).toBeTruthy();
  expect(screen.getByText(/test ✓/)).toBeTruthy();
});

test('shows failing quality gate', () => {
  render(<TaskCard title="scaffold" expanded={true} qualityGates={{ lint: false }} />);
  expect(screen.getByText(/lint ✗/)).toBeTruthy();
});

test('shows test counts when expanded', () => {
  render(<TaskCard title="scaffold" expanded={true} tests={{ added: 3, passing: 10 }} />);
  expect(screen.getByText(/3 added, 10 passing/)).toBeTruthy();
});

test('collapses on second click', () => {
  render(<TaskCard title="scaffold" commit="feat(db): add models" />);
  fireEvent.click(screen.getByText('scaffold'));
  expect(screen.getByText('feat(db): add models')).toBeTruthy();
  fireEvent.click(screen.getByText('scaffold'));
  expect(screen.queryByText('feat(db): add models')).toBeNull();
});
