import { render, screen, fireEvent } from '@testing-library/preact';
import { CompletionScreen } from '../../src/components/build/CompletionScreen';

test('renders status label and title with project name', () => {
  render(<CompletionScreen summary={{ projectName: 'ACME' }} />);
  expect(screen.getByText('SYSTEM_STATUS: DEPLOY_READY')).toBeTruthy();
  expect(screen.getByText(/Forge Completion: ACME/)).toBeTruthy();
});

test('renders default title when no projectName', () => {
  render(<CompletionScreen summary={{}} />);
  expect(screen.getByText(/Forge Completion: Untitled/)).toBeTruthy();
});

test('renders Claw\'d mascot placeholder when no sprite', () => {
  render(<CompletionScreen summary={{}} />);
  const mascot = screen.getByTestId('clawd-mascot');
  expect(mascot).toBeTruthy();
});

test('renders validation passed text', () => {
  render(<CompletionScreen summary={{}} />);
  expect(screen.getByText(/Validation Passed/)).toBeTruthy();
});

test('renders phases completed metric', () => {
  render(<CompletionScreen summary={{ phases: 3, totalPhases: 5 }} />);
  expect(screen.getByText('3/5')).toBeTruthy();
  expect(screen.getByText('PHASES COMPLETED')).toBeTruthy();
});

test('renders tests passed metric', () => {
  render(<CompletionScreen summary={{ tests: '98%', testCount: 127 }} />);
  expect(screen.getByText('98%')).toBeTruthy();
  expect(screen.getByText('TESTS PASSED')).toBeTruthy();
});

test('renders elapsed time metric', () => {
  render(<CompletionScreen summary={{ elapsed: '01:12:34' }} />);
  expect(screen.getByText('01:12:34')).toBeTruthy();
  expect(screen.getByText('TOTAL FORGE TIME')).toBeTruthy();
});

test('renders known issues metric', () => {
  render(<CompletionScreen summary={{ issues: ['Bug A', 'Bug B'] }} />);
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('KNOWN ISSUES')).toBeTruthy();
});

test('renders deploy URL when provided', () => {
  render(<CompletionScreen summary={{ deployed: 'https://app.railway.app' }} />);
  const link = screen.getByText('https://app.railway.app');
  expect(link).toBeTruthy();
  expect(link.tagName).toBe('A');
});

test('renders build log when provided', () => {
  const buildLog = ['[09:15:01] Compiling...', '[09:15:03] Done.'];
  render(<CompletionScreen summary={{ buildLog }} />);
  expect(screen.getByText('[09:15:01] Compiling...')).toBeTruthy();
  expect(screen.getByText('[09:15:03] Done.')).toBeTruthy();
});

test('renders known issues list in detail section', () => {
  const issues = [
    { id: 'BUG-001', description: 'Slow on mobile', severity: 'warning' },
    { id: 'BUG-002', description: 'No dark mode', severity: 'error' },
  ];
  render(<CompletionScreen summary={{ issues }} />);
  expect(screen.getByText('BUG-001')).toBeTruthy();
  expect(screen.getByText('Slow on mobile')).toBeTruthy();
  expect(screen.getByText('BUG-002')).toBeTruthy();
});

test('renders Initiate Deployment button', () => {
  render(<CompletionScreen summary={{}} />);
  expect(screen.getByText(/Initiate Deployment/)).toBeTruthy();
});

test('renders Archive Build button when onNewProject provided', () => {
  const onNewProject = vi.fn();
  render(<CompletionScreen summary={{}} onNewProject={onNewProject} />);
  fireEvent.click(screen.getByText('Archive Build'));
  expect(onNewProject).toHaveBeenCalled();
});

test('handles null summary gracefully', () => {
  render(<CompletionScreen summary={null} />);
  expect(screen.getByText(/Forge Completion/)).toBeTruthy();
});

test('renders string issues as simple list items', () => {
  render(<CompletionScreen summary={{ issues: ['Slow on mobile', 'No dark mode'] }} />);
  expect(screen.getByText('Slow on mobile')).toBeTruthy();
  expect(screen.getByText('No dark mode')).toBeTruthy();
});
