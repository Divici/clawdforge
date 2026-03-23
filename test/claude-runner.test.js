import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');

// We test ClaudeRunner by monkey-patching child_process.spawn
// before importing the module, since vi.mock with CJS is unreliable.
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
});

afterEach(() => {
  childProcess.spawn = originalSpawn;
  fs.mkdirSync = originalMkdirSync;
  fs.writeFileSync = originalWriteFileSync;
  fs.unlinkSync = originalUnlinkSync;
});

// Import after patching
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
    it('spawns claude with correct arguments', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'Run the /workflow skill' });
      expect(childProcess.spawn).toHaveBeenCalledOnce();
      const [cmd, args, opts] = childProcess.spawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).toContain('-p');
      expect(args).toContain('Run the /workflow skill');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--verbose');
      expect(args).toContain('--dangerously-skip-permissions');
      expect(opts.cwd).toBe('/tmp/project');
    });

    it('returns the child process', () => {
      const result = runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      expect(result).toBeDefined();
      expect(result.pid).toBe(12345);
    });

    it('uses default prompt when none provided', () => {
      runner.spawn({ projectDir: '/tmp/project' });
      const [, args] = childProcess.spawn.mock.calls[0];
      expect(args).toContain('Run the /workflow skill');
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

    it('forwards text to onText callback for StageParser', () => {
      const onText = vi.fn();
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test', onText });
      const child = getLastChild();
      pushLine(child, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: '[FORGE:PHASE phase=scaffold total=3 current=1]' }] },
      });
      expect(onText).toHaveBeenCalledWith('[FORGE:PHASE phase=scaffold total=3 current=1]');
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

  describe('respond (resume)', () => {
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
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
    });

    it('kills previous child if still alive before responding', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const firstChild = getLastChild();
      pushLine(firstChild, { type: 'system', subtype: 'init', session_id: 'sess-x', tools: [] });

      runner.respond('answer');
      expect(firstChild.kill).toHaveBeenCalled();
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

  describe('forge rules', () => {
    it('installs forge rules on spawn', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('removes forge rules on kill', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      runner.kill();
      expect(fs.unlinkSync).toHaveBeenCalled();
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
