import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');

const childProcess = require('child_process');
const fs = require('fs');

function createMockChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();
  child.pid = 12345;
  return child;
}

let mockChildren = [];
const originalSpawn = childProcess.spawn;
const originalMkdirSync = fs.mkdirSync;
const originalWriteFileSync = fs.writeFileSync;
const originalUnlinkSync = fs.unlinkSync;
const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;
const originalAppendFileSync = fs.appendFileSync;

beforeEach(() => {
  mockChildren = [];
  childProcess.spawn = vi.fn((..._args) => {
    const child = createMockChild();
    mockChildren.push(child);
    return child;
  });
  fs.mkdirSync = vi.fn();
  fs.writeFileSync = vi.fn();
  fs.unlinkSync = vi.fn();
  fs.existsSync = vi.fn(() => false);
  fs.readFileSync = vi.fn(() => '{}');
  fs.appendFileSync = vi.fn();
});

afterEach(() => {
  childProcess.spawn = originalSpawn;
  fs.mkdirSync = originalMkdirSync;
  fs.writeFileSync = originalWriteFileSync;
  fs.unlinkSync = originalUnlinkSync;
  fs.existsSync = originalExistsSync;
  fs.readFileSync = originalReadFileSync;
  fs.appendFileSync = originalAppendFileSync;
});

const { ClaudeRunner } = require('../src/bridge/claude-runner');

function getLastChild() {
  return mockChildren[mockChildren.length - 1];
}

function pushLine(child, jsonObj) {
  child.stdout.write(JSON.stringify(jsonObj) + '\n');
}

describe('ClaudeRunner (stream-json)', () => {
  let bus;
  let runner;

  beforeEach(() => {
    bus = new EventEmitter();
    vi.spyOn(bus, 'emit');
    runner = new ClaudeRunner(bus);
  });

  afterEach(() => {
    runner.kill();
  });

  describe('spawn', () => {
    it('spawns claude with -p and --output-format stream-json', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'Run the /workflow skill' });
      expect(childProcess.spawn).toHaveBeenCalledOnce();
      const [cmd, args, opts] = childProcess.spawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('-p');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--verbose');
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).not.toContain('--input-format');
      expect(opts.cwd).toBe('/tmp/project');
      expect(opts.stdio).toEqual(['ignore', 'pipe', 'pipe']);
    });

    it('prepends autonomous mode prefix to prompt', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'Run the /workflow skill' });
      const [, args] = childProcess.spawn.mock.calls[0];
      const promptIdx = args.indexOf('-p') + 1;
      expect(args[promptIdx]).toContain('AUTONOMOUS mode');
      expect(args[promptIdx]).toContain('Run the /workflow skill');
    });

    it('prepends interactive mode prefix when runMode is interactive', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test', runMode: 'interactive' });
      const [, args] = childProcess.spawn.mock.calls[0];
      const promptIdx = args.indexOf('-p') + 1;
      expect(args[promptIdx]).toContain('INTERACTIVE mode');
    });

    it('returns the child process', () => {
      const result = runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      expect(result).toBeDefined();
      expect(result.pid).toBe(12345);
    });

    it('uses default prompt when none provided', () => {
      runner.spawn({ projectDir: '/tmp/project' });
      const [, args] = childProcess.spawn.mock.calls[0];
      const promptIdx = args.indexOf('-p') + 1;
      expect(args[promptIdx]).toContain('Run the /workflow skill');
    });
  });

  describe('disk-state infrastructure', () => {
    it('creates .forge/ directory on spawn', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      const mkdirCalls = fs.mkdirSync.mock.calls.map(c => c[0]);
      expect(mkdirCalls.some(p => p.includes('.forge'))).toBe(true);
    });

    it('adds .forge/ to .gitignore if not already present', () => {
      fs.existsSync = vi.fn(() => false); // no .gitignore exists
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      expect(fs.appendFileSync).toHaveBeenCalled();
      const appendCall = fs.appendFileSync.mock.calls.find(c => c[0].includes('.gitignore'));
      expect(appendCall).toBeDefined();
      expect(appendCall[1]).toContain('.forge/');
    });

    it('skips .gitignore append if .forge/ already listed', () => {
      fs.existsSync = vi.fn(() => true);
      fs.readFileSync = vi.fn(() => 'node_modules/\n.forge/\n');
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      const appendCalls = fs.appendFileSync.mock.calls.filter(c => c[0].includes('.gitignore'));
      expect(appendCalls).toHaveLength(0);
    });

    it('installs gate-check.js in .forge/', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      const writeCalls = fs.writeFileSync.mock.calls;
      const hookWrite = writeCalls.find(c => c[0].includes('gate-check.js'));
      expect(hookWrite).toBeDefined();
      expect(hookWrite[1]).toContain('FORGE GATE CHECK');
    });

    it('writes Stop hook config to .claude/settings.local.json', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      const writeCalls = fs.writeFileSync.mock.calls;
      const settingsWrite = writeCalls.find(c => c[0].includes('settings.local.json'));
      expect(settingsWrite).toBeDefined();
      const settings = JSON.parse(settingsWrite[1]);
      expect(settings.hooks.Stop).toBeDefined();
      expect(settings.hooks.Stop[0].hooks[0].command).toContain('gate-check.js');
    });

    it('installs forge protocol rules with autonomous mode', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      const writeCalls = fs.writeFileSync.mock.calls;
      const rulesWrite = writeCalls.find(c => c[0].includes('forge-protocol.md'));
      expect(rulesWrite).toBeDefined();
      expect(rulesWrite[1]).toContain('Autonomous Mode');
      expect(rulesWrite[1]).toContain('.forge/state.json');
    });

    it('installs forge protocol rules with interactive mode', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test', runMode: 'interactive' });
      const writeCalls = fs.writeFileSync.mock.calls;
      const rulesWrite = writeCalls.find(c => c[0].includes('forge-protocol.md'));
      expect(rulesWrite).toBeDefined();
      expect(rulesWrite[1]).toContain('Interactive Mode');
    });

    it('starts ForgeStateWatcher on spawn', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      expect(runner._watcher).not.toBeNull();
    });
  });

  describe('writeUserInput', () => {
    it('writes user-input.json to .forge/', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      runner.writeUserInput('q1', 'SQLite');
      const writeCalls = fs.writeFileSync.mock.calls;
      const inputWrite = writeCalls.find(c => c[0].includes('user-input.json'));
      expect(inputWrite).toBeDefined();
      const data = JSON.parse(inputWrite[1]);
      expect(data.requestId).toBe('q1');
      expect(data.answer).toBe('SQLite');
      expect(data.version).toBe(1);
      expect(data.answeredAt).toBeDefined();
    });

    it('throws if no project directory', () => {
      expect(() => runner.writeUserInput('q1', 'test')).toThrow(/no project/i);
    });
  });

  describe('session management', () => {
    it('extracts sessionId from system init event', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, { type: 'system', subtype: 'init', session_id: 'sess-123', tools: [] });
      expect(runner.sessionId).toBe('sess-123');
    });

    it('emits claude:session event on init', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, { type: 'system', subtype: 'init', session_id: 'sess-456', tools: ['Read', 'Edit'] });
      expect(bus.emit).toHaveBeenCalledWith('claude:session', { sessionId: 'sess-456', tools: ['Read', 'Edit'] });
    });
  });

  describe('tool_use events', () => {
    it('emits claude:tool-use for tool_use content blocks', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, {
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'toolu_123',
            name: 'Read',
            input: { file_path: '/tmp/foo.js' },
          }],
        },
      });
      expect(bus.emit).toHaveBeenCalledWith('claude:tool-use', {
        id: 'toolu_123',
        name: 'Read',
        input: { file_path: '/tmp/foo.js' },
      });
    });

    it('emits claude:tool-result for tool results', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, {
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_123', content: 'file contents' }] },
      });
      expect(bus.emit).toHaveBeenCalledWith('claude:tool-result', {
        tool_use_id: 'toolu_123',
        content: 'file contents',
      });
    });
  });

  describe('assistant text events', () => {
    it('emits claude:text for text content blocks', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Starting presearch...' }] },
      });
      expect(bus.emit).toHaveBeenCalledWith('claude:text', { text: 'Starting presearch...' });
    });

    it('forwards text to onText callback', () => {
      const onText = vi.fn();
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test', onText });
      const child = getLastChild();
      pushLine(child, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'hello' }] },
      });
      expect(onText).toHaveBeenCalledWith('hello');
    });
  });

  describe('result events', () => {
    it('emits claude:cost on result', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, {
        type: 'result',
        session_id: 'sess-1',
        total_cost_usd: 0.15,
        duration_ms: 5000,
        stop_reason: 'end_turn',
        is_error: false,
      });
      expect(bus.emit).toHaveBeenCalledWith('claude:cost', {
        sessionId: 'sess-1',
        totalCostUsd: 0.15,
        durationMs: 5000,
        stopReason: 'end_turn',
        isError: false,
      });
    });

    it('emits claude:turn-end on result', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, {
        type: 'result',
        session_id: 'sess-1',
        stop_reason: 'end_turn',
        is_error: false,
        total_cost_usd: 0.1,
        duration_ms: 3000,
      });
      expect(bus.emit).toHaveBeenCalledWith('claude:turn-end', { sessionId: 'sess-1', stopReason: 'end_turn' });
    });
  });

  describe('respond (--resume, deprecated)', () => {
    it('spawns a new process with --resume and session_id', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, { type: 'system', subtype: 'init', session_id: 'sess-abc', tools: [] });
      pushLine(child, { type: 'result', session_id: 'sess-abc', stop_reason: 'end_turn', is_error: false, total_cost_usd: 0, duration_ms: 0 });
      child.emit('close', 0);

      runner.respond('PostgreSQL');
      expect(childProcess.spawn).toHaveBeenCalledTimes(2);
      const [cmd, args] = childProcess.spawn.mock.calls[1];
      expect(cmd).toBe('claude');
      expect(args).toContain('--resume');
      expect(args).toContain('sess-abc');
      expect(args).toContain('-p');
      expect(args).toContain('PostgreSQL');
    });

    it('throws if no sessionId available', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      expect(() => runner.respond('answer')).toThrow(/no session/i);
    });
  });

  describe('process lifecycle', () => {
    it('emits claude:exit on child close', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      child.emit('close', 0);
      expect(bus.emit).toHaveBeenCalledWith('claude:exit', { code: 0 });
    });

    it('kill terminates the child process', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      runner.kill();
      expect(child.kill).toHaveBeenCalled();
    });

    it('kill stops the watcher', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const watcher = runner._watcher;
      const stopSpy = vi.spyOn(watcher, 'stop');
      runner.kill();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('kill does not throw when no process exists', () => {
      expect(() => runner.kill()).not.toThrow();
    });

    it('handles stderr output', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      child.stderr.write('Warning: something happened\n');
      expect(bus.emit).toHaveBeenCalledWith('claude:error', { message: 'Warning: something happened' });
    });
  });

  describe('cleanup on kill', () => {
    it('removes installed files on kill', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      runner.kill();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('cleans up Stop hook from settings.local.json', () => {
      // Pre-populate settings with our hook
      fs.readFileSync = vi.fn((p) => {
        if (typeof p === 'string' && p.includes('settings.local.json')) {
          return JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node .forge/gate-check.js' }] }] } });
        }
        return '{}';
      });

      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      runner.kill();

      // Verify settings was rewritten without Stop hook
      const settingsWrites = fs.writeFileSync.mock.calls.filter(c =>
        typeof c[0] === 'string' && c[0].includes('settings.local.json')
      );
      const lastWrite = settingsWrites[settingsWrites.length - 1];
      if (lastWrite) {
        const settings = JSON.parse(lastWrite[1]);
        expect(settings.hooks?.Stop).toBeUndefined();
      }
    });
  });

  describe('multiple content blocks per message', () => {
    it('handles text + tool_use in same message', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();
      pushLine(child, {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me read that file.' },
            { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: '/tmp/x' } },
          ],
        },
      });
      expect(bus.emit).toHaveBeenCalledWith('claude:text', { text: 'Let me read that file.' });
      expect(bus.emit).toHaveBeenCalledWith('claude:tool-use', { id: 'toolu_1', name: 'Read', input: { file_path: '/tmp/x' } });
    });
  });
});
