import { render, screen } from '@testing-library/preact';
import { App } from '../../src/App';

beforeEach(() => {
  window.forgeAPI = {
    onStateUpdate: vi.fn(),
    onPresearchUpdate: vi.fn(),
    onBuildUpdate: vi.fn(),
    onModeChange: vi.fn(),
    onWaitingForInput: vi.fn(),
    onRawOutput: vi.fn(),
    onToolUse: vi.fn(),
    onToolResult: vi.fn(),
    onSession: vi.fn(),
    onCost: vi.fn(),
    onTurnEnd: vi.fn(),
    onClaudeExit: vi.fn(),
    sendForgeResponse: vi.fn(),
    spawnClaude: vi.fn(),
    selectDirectory: vi.fn(),
    scanForPRD: vi.fn(),
    loadForgeLog: vi.fn(),
  };
});

afterEach(() => {
  delete window.forgeAPI;
});

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
  expect(screen.getByText('Start Build')).toBeTruthy();
});

test('stage zone contains canvas', () => {
  const { container } = render(<App />);
  const stage = container.querySelector('.app-layout__stage');
  const canvas = stage.querySelector('canvas');
  expect(canvas).toBeTruthy();
});
