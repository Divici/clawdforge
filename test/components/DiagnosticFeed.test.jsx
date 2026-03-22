import { render, screen } from '@testing-library/preact';
import { DiagnosticFeed } from '../../src/components/presearch/DiagnosticFeed';

test('renders nothing when no events', () => {
  const { container } = render(<DiagnosticFeed events={[]} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when events is null', () => {
  const { container } = render(<DiagnosticFeed events={null} />);
  expect(container.innerHTML).toBe('');
});

test('renders heading when events exist', () => {
  const events = [{ level: 'sys', message: 'Initializing...' }];
  render(<DiagnosticFeed events={events} />);
  expect(screen.getByText('Diagnostic Feed')).toBeTruthy();
});

test('renders event messages', () => {
  const events = [
    { level: 'sys', message: 'Scanning pathways' },
    { level: 'ok', message: 'Path selected' },
  ];
  render(<DiagnosticFeed events={events} />);
  expect(screen.getByText(/Scanning pathways/)).toBeTruthy();
  expect(screen.getByText(/Path selected/)).toBeTruthy();
});

test('renders level prefixes', () => {
  const events = [
    { level: 'sys', message: 'test sys' },
    { level: 'ok', message: 'test ok' },
    { level: 'log', message: 'test log' },
  ];
  render(<DiagnosticFeed events={events} />);
  expect(screen.getByText('[SYS]')).toBeTruthy();
  expect(screen.getByText('[OK]')).toBeTruthy();
  expect(screen.getByText('[LOG]')).toBeTruthy();
});
