import { render, screen, fireEvent } from '@testing-library/preact';
import { LaunchScreen } from '../../src/components/LaunchScreen';

// Mock window.forgeAPI
beforeEach(() => {
  globalThis.window = globalThis.window || {};
  window.forgeAPI = {
    selectDirectory: vi.fn(),
    scanForPRD: vi.fn(),
    spawnClaude: vi.fn(),
  };
});

test('renders title', () => {
  render(<LaunchScreen onLaunch={() => {}} />);
  expect(screen.getByText('Initialize Forge Session')).toBeTruthy();
});

test('renders browse button', () => {
  render(<LaunchScreen onLaunch={() => {}} />);
  expect(screen.getByText('Browse')).toBeTruthy();
});

test('start button is disabled without directory', () => {
  render(<LaunchScreen onLaunch={() => {}} />);
  const btn = screen.getByText('Start Build');
  expect(btn.disabled).toBe(true);
});

test('shows resource manifest after directory selection with PRD files', async () => {
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={() => {}} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  expect(screen.getByText('Resource Manifest')).toBeTruthy();
  expect(screen.getByText('prd.md')).toBeTruthy();
});

test('shows describe mode textarea when no PRD files found', async () => {
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: [], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={() => {}} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  expect(screen.getByPlaceholderText('Awaiting directives...')).toBeTruthy();
});

test('shows resume option when WORKFLOW_STATE.md exists', async () => {
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: [], hasWorkflowState: true });

  render(<LaunchScreen onLaunch={() => {}} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  expect(screen.getByText('Resume Workflow')).toBeTruthy();
});

test('calls onLaunch with prd mode when PRD file selected', async () => {
  const onLaunch = vi.fn();
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={onLaunch} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  fireEvent.click(screen.getByText('Start Build'));
  expect(onLaunch).toHaveBeenCalledWith({
    projectDir: '/test/project',
    mode: 'prd',
    runMode: 'autonomous',
    prdFile: 'prd.md',
    description: null,
  });
});

test('calls onLaunch with describe mode when description entered', async () => {
  const onLaunch = vi.fn();
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: [], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={onLaunch} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  const textarea = screen.getByPlaceholderText('Awaiting directives...');
  fireEvent.input(textarea, { target: { value: 'Build a dashboard' } });
  fireEvent.click(screen.getByText('Start Build'));

  expect(onLaunch).toHaveBeenCalledWith({
    projectDir: '/test/project',
    mode: 'describe',
    runMode: 'autonomous',
    prdFile: null,
    description: 'Build a dashboard',
  });
});

test('shows mode toggle after directory selection', async () => {
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={() => {}} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  expect(screen.getByText('Run Mode')).toBeTruthy();
  expect(screen.getByText('Autonomous')).toBeTruthy();
  expect(screen.getByText('Interactive')).toBeTruthy();
});

test('passes interactive runMode when toggled', async () => {
  const onLaunch = vi.fn();
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={onLaunch} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  fireEvent.click(screen.getByText('Interactive'));
  fireEvent.click(screen.getByText('Start Build'));

  expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ runMode: 'interactive' }));
});

test('calls onLaunch with resume mode', async () => {
  const onLaunch = vi.fn();
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: true });

  render(<LaunchScreen onLaunch={onLaunch} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  fireEvent.click(screen.getByText('Resume Workflow'));

  expect(onLaunch).toHaveBeenCalledWith({
    projectDir: '/test/project',
    mode: 'resume',
    prdFile: null,
    description: null,
  });
});
