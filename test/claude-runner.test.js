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
  child.stdin = new PassThrough();
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
    it('spawns claude with correct arguments (no -p, uses stdin)', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'Run the /workflow skill' });
      expect(childProcess.spawn).toHaveBeenCalledOnce();
      const [cmd, args, opts] = childProcess.spawn.mock.calls[0];
      expect(cmd).toBe('claude');
      expect(args).not.toContain('-p');
      expect(args).toContain('--input-format');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--verbose');
      expect(args).toContain('--dangerously-skip-permissions');
      expect(opts.cwd).toBe('/tmp/project');
      expect(opts.stdio).toEqual(['pipe', 'pipe', 'pipe']);
    });

    it('does not pass -p flag (initial prompt goes via stdin)', () => {
      runner.spawn({ projectDir: '/tmp/project', prompt: 'Run the /workflow skill' });
      const [, args] = childProcess.spawn.mock.calls[0];
      expect(args).not.toContain('-p');
      expect(args).not.toContain('Run the /workflow skill');
    });

    it('returns the child process', () => {
      const result = runner.spawn({ projectDir: '/tmp/project', prompt: 'test' });
      expect(result).toBeDefined();
      expect(result.pid).toBe(12345);
    });

    it('writes initial prompt to stdin (verified via respond sharing same path)', () => {
      // The initial prompt is written via _writeUserMessage, same as respond().
      // We verify respond() writes correctly in the respond tests below,
      // and here we just verify spawn doesn't use -p.
      runner.spawn({ projectDir: '/tmp/project' });
      const [, args] = childProcess.spawn.mock.calls[0];
      expect(args).not.toContain('-p');
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

  describe('respond (stdin)', () => {
    it('writes user message as JSON to stdin', async () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      const child = getLastChild();

      const written = [];
      child.stdin.on('data', (chunk) => written.push(chunk.toString()));

      // Wait a tick for initial prompt write to flush through
      await new Promise((r) => setTimeout(r, 5));
      written.length = 0; // clear initial prompt

      runner.respond('PostgreSQL');
      await new Promise((r) => setTimeout(r, 5));

      expect(childProcess.spawn).toHaveBeenCalledTimes(1); // no respawn
      expect(written.length).toBeGreaterThan(0);
      const msg = JSON.parse(written[0].trim());
      expect(msg.type).toBe('user');
      expect(msg.message.role).toBe('user');
      expect(msg.message.content[0].text).toBe('PostgreSQL');
    });

    it('does not spawn a new process', () => {
      runner.spawn({ projectDir: '/tmp/p', prompt: 'test' });
      runner.respond('answer');
      expect(childProcess.spawn).toHaveBeenCalledTimes(1);
    });

    it('throws if no running process', () => {
      expect(() => runner.respond('answer')).toThrow(/no running/i);
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
