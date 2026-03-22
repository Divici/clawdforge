import { render, screen, fireEvent } from '@testing-library/preact';
import { BlockerCard } from '../../src/components/build/BlockerCard';

test('renders intervention required label', () => {
  render(<BlockerCard title="API key required" description="Need key" />);
  expect(screen.getByText('Intervention Required')).toBeTruthy();
});

test('renders description', () => {
  render(<BlockerCard title="Blocker" description="Missing credentials" />);
  expect(screen.getByText('Missing credentials')).toBeTruthy();
});

test('renders error code when provided', () => {
  render(<BlockerCard title="Blocker" description="desc" errorCode="ERR_042" />);
  expect(screen.getByText('ERR_042')).toBeTruthy();
});

test('shows resolve now button and fires callback', () => {
  const onSkipMock = vi.fn();
  render(<BlockerCard title="Blocker" description="desc" onSkipMock={onSkipMock} />);
  fireEvent.click(screen.getByText('Resolve Now'));
  expect(onSkipMock).toHaveBeenCalled();
});

test('shows ignore task button and fires callback', () => {
  const onSkip = vi.fn();
  render(<BlockerCard title="Blocker" description="desc" onSkip={onSkip} />);
  fireEvent.click(screen.getByText('Ignore Task'));
  expect(onSkip).toHaveBeenCalled();
});

test('shows tried approaches toggle', () => {
  render(<BlockerCard title="Blocker" description="desc" triedApproaches={['Approach A', 'Approach B']} />);
  expect(screen.getByText(/What was tried \(2 approaches\)/)).toBeTruthy();
});

test('expands tried approaches on click', () => {
  render(<BlockerCard title="Blocker" description="desc" triedApproaches={['Approach A', 'Approach B']} />);
  fireEvent.click(screen.getByText(/What was tried/));
  expect(screen.getByText('Approach A')).toBeTruthy();
  expect(screen.getByText('Approach B')).toBeTruthy();
});

test('submit key button disabled when input empty', () => {
  const onSubmitKey = vi.fn();
  render(<BlockerCard title="Blocker" description="desc" onSubmitKey={onSubmitKey} />);
  const submitBtn = screen.getByText('Submit Key');
  expect(submitBtn.disabled).toBe(true);
});

test('submit key button enabled after input', () => {
  const onSubmitKey = vi.fn();
  render(<BlockerCard title="Blocker" description="desc" onSubmitKey={onSubmitKey} />);
  const input = screen.getByPlaceholderText(/Paste API key/);
  fireEvent.input(input, { target: { value: 'sk-123' } });
  fireEvent.click(screen.getByText('Submit Key'));
  expect(onSubmitKey).toHaveBeenCalledWith('sk-123');
});
