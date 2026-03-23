import { render, screen } from '@testing-library/preact';
import { ToolActivityFeed } from '../../src/components/build/ToolActivityFeed';

describe('ToolActivityFeed', () => {
  let toolUseCallback;
  let toolResultCallback;

  beforeEach(() => {
    toolUseCallback = null;
    toolResultCallback = null;
    window.forgeAPI = {
      onToolUse: (cb) => { toolUseCallback = cb; },
      onToolResult: (cb) => { toolResultCallback = cb; },
    };
  });

  afterEach(() => {
    delete window.forgeAPI;
  });

  it('renders with waiting message when no events', () => {
    render(<ToolActivityFeed />);
    expect(screen.getByText('Waiting for tool activity...')).toBeTruthy();
  });

  it('renders header', () => {
    render(<ToolActivityFeed />);
    expect(screen.getByText('Tool Activity')).toBeTruthy();
  });

  it('shows tool use event when received', async () => {
    render(<ToolActivityFeed />);
    toolUseCallback({
      id: 'toolu_1',
      name: 'Read',
      input: { file_path: '/tmp/project/src/main.ts' },
    });
    // Wait for state update
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('main.ts')).toBeTruthy();
  });

  it('shows Bash command summary', async () => {
    render(<ToolActivityFeed />);
    toolUseCallback({
      id: 'toolu_2',
      name: 'Bash',
      input: { command: 'npm test' },
    });
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByText('Bash')).toBeTruthy();
    expect(screen.getByText('npm test')).toBeTruthy();
  });

  it('shows Grep pattern summary', async () => {
    render(<ToolActivityFeed />);
    toolUseCallback({
      id: 'toolu_3',
      name: 'Grep',
      input: { pattern: 'socket' },
    });
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByText('Grep')).toBeTruthy();
    expect(screen.getByText('socket')).toBeTruthy();
  });

  it('renders without crashing when no forgeAPI', () => {
    delete window.forgeAPI;
    expect(() => render(<ToolActivityFeed />)).not.toThrow();
  });
});
