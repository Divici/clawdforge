import { render, screen, fireEvent } from '@testing-library/preact';
import { CompletionScreen } from '../../src/components/build/CompletionScreen';

test('renders Build Complete title', () => {
  render(<CompletionScreen summary={{}} />);
  expect(screen.getByText(/Build Complete/)).toBeTruthy();
});

test('shows phase count', () => {
  render(<CompletionScreen summary={{ phases: 5 }} />);
  expect(screen.getByText('Phases completed: 5')).toBeTruthy();
});

test('shows test count', () => {
  render(<CompletionScreen summary={{ tests: 127 }} />);
  expect(screen.getByText('Tests passing: 127')).toBeTruthy();
});

test('shows elapsed time', () => {
  render(<CompletionScreen summary={{ elapsed: '12m 34s' }} />);
  expect(screen.getByText('Time elapsed: 12m 34s')).toBeTruthy();
});

test('shows deployed URL as link', () => {
  render(<CompletionScreen summary={{ deployed: 'https://app.railway.app' }} />);
  const link = screen.getByText('https://app.railway.app');
  expect(link).toBeTruthy();
  expect(link.tagName).toBe('A');
  expect(link.href).toBe('https://app.railway.app/');
});

test('shows known issues', () => {
  render(<CompletionScreen summary={{ issues: ['Slow on mobile', 'No dark mode'] }} />);
  expect(screen.getByText('- Slow on mobile')).toBeTruthy();
  expect(screen.getByText('- No dark mode')).toBeTruthy();
});

test('shows New Project button when callback provided', () => {
  const onNewProject = vi.fn();
  render(<CompletionScreen summary={{}} onNewProject={onNewProject} />);
  fireEvent.click(screen.getByText('New Project'));
  expect(onNewProject).toHaveBeenCalled();
});

test('handles null summary gracefully', () => {
  render(<CompletionScreen summary={null} />);
  expect(screen.getByText(/Build Complete/)).toBeTruthy();
});
