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
  expect(screen.getByText("CLAW'D FORGE")).toBeTruthy();
});

test('renders browse button', () => {
  render(<LaunchScreen onLaunch={() => {}} />);
  expect(screen.getByText('Browse')).toBeTruthy();
});

test('start button is disabled without directory', () => {
  render(<LaunchScreen onLaunch={() => {}} />);
  const btn = screen.getByText('Start Forge');
  expect(btn.disabled).toBe(true);
});

test('shows options after directory selection', async () => {
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={() => {}} />);
  fireEvent.click(screen.getByText('Browse'));

  // Wait for async scan
  await new Promise((r) => setTimeout(r, 50));

  expect(screen.getByText('Use a PRD file')).toBeTruthy();
  expect(screen.getByText('Describe your project')).toBeTruthy();
});

test('shows resume option when WORKFLOW_STATE.md exists', async () => {
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: [], hasWorkflowState: true });

  render(<LaunchScreen onLaunch={() => {}} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  expect(screen.getByText('Resume existing workflow')).toBeTruthy();
});

test('calls onLaunch with correct config', async () => {
  const onLaunch = vi.fn();
  window.forgeAPI.selectDirectory.mockResolvedValue('/test/project');
  window.forgeAPI.scanForPRD.mockResolvedValue({ prdFiles: ['prd.md'], hasWorkflowState: false });

  render(<LaunchScreen onLaunch={onLaunch} />);
  fireEvent.click(screen.getByText('Browse'));

  await new Promise((r) => setTimeout(r, 50));

  fireEvent.click(screen.getByText('Start Forge'));
  expect(onLaunch).toHaveBeenCalledWith({
    projectDir: '/test/project',
    mode: 'prd',
    prdFile: 'prd.md',
    description: null,
  });
});
