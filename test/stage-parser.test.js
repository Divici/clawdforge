import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ForgeBus } = require('../src/bridge/event-bus');
const { StageParser } = require('../src/bridge/stage-parser');

describe('StageParser', () => {
  let bus;
  let parser;

  beforeEach(() => {
    bus = new ForgeBus();
    parser = new StageParser(bus);
  });

  describe('mode:change', () => {
    it('detects presearch mode', () => {
      const handler = vi.fn();
      bus.on('mode:change', handler);
      parser.parseLine('Starting presearch phase...');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'presearch' })
      );
    });

    it('detects build mode', () => {
      const handler = vi.fn();
      bus.on('mode:change', handler);
      parser.parseLine('Switching to build mode');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'build' })
      );
    });

    it('is case insensitive', () => {
      const handler = vi.fn();
      bus.on('mode:change', handler);
      parser.parseLine('DEPLOYING to production');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'DEPLOYING' })
      );
    });
  });

  describe('stage:change', () => {
    it('detects [STAGE:xxx] format', () => {
      const handler = vi.fn();
      bus.on('stage:change', handler);
      parser.parseLine('[STAGE:scaffold]');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'scaffold' })
      );
    });

    it('detects Phase: xxx format', () => {
      const handler = vi.fn();
      bus.on('stage:change', handler);
      parser.parseLine('Phase: canvas-base started');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'canvas-base' })
      );
    });
  });

  describe('agent:spawn', () => {
    it('detects "Launching agent"', () => {
      const handler = vi.fn();
      bus.on('agent:spawn', handler);
      parser.parseLine('Launching agent for code review');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Subagent started"', () => {
      const handler = vi.fn();
      bus.on('agent:spawn', handler);
      parser.parseLine('Subagent started: explore-codebase');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Spawning agent"', () => {
      const handler = vi.fn();
      bus.on('agent:spawn', handler);
      parser.parseLine('Spawning agent for file search');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects Agent tool launch', () => {
      const handler = vi.fn();
      bus.on('agent:spawn', handler);
      parser.parseLine('Agent tool launched for task');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('agent:done', () => {
    it('detects "Subagent complete"', () => {
      const handler = vi.fn();
      bus.on('agent:done', handler);
      parser.parseLine('Subagent complete: explore-codebase');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Agent finished"', () => {
      const handler = vi.fn();
      bus.on('agent:done', handler);
      parser.parseLine('Agent finished with results');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Agent returned"', () => {
      const handler = vi.fn();
      bus.on('agent:done', handler);
      parser.parseLine('Agent returned successfully');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('decision:lock', () => {
    it('detects "Decision locked"', () => {
      const handler = vi.fn();
      bus.on('decision:lock', handler);
      parser.parseLine('Decision locked: use PostgreSQL');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "LOCKED:"', () => {
      const handler = vi.fn();
      bus.on('decision:lock', handler);
      parser.parseLine('LOCKED: Tech stack is React + Node');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('artifact:create', () => {
    it('detects "File created"', () => {
      const handler = vi.fn();
      bus.on('artifact:create', handler);
      parser.parseLine('File created successfully at: src/main.ts');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Created file"', () => {
      const handler = vi.fn();
      bus.on('artifact:create', handler);
      parser.parseLine('Created file src/utils.ts');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Writing .ext"', () => {
      const handler = vi.fn();
      bus.on('artifact:create', handler);
      parser.parseLine('Writing package.json');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('warning', () => {
    it('detects warning emoji', () => {
      const handler = vi.fn();
      bus.on('warning', handler);
      parser.parseLine('⚠ Rate limit approaching');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Warning:" text', () => {
      const handler = vi.fn();
      bus.on('warning', handler);
      parser.parseLine('Warning: disk space low');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('detects "Blocker:" text', () => {
      const handler = vi.fn();
      bus.on('warning', handler);
      parser.parseLine('Blocker: need API key');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('feed()', () => {
    it('handles multi-line chunks', () => {
      const modeHandler = vi.fn();
      const agentHandler = vi.fn();
      bus.on('mode:change', modeHandler);
      bus.on('agent:spawn', agentHandler);

      parser.feed('Starting presearch\nLaunching agent for search\n');
      expect(modeHandler).toHaveBeenCalledOnce();
      expect(agentHandler).toHaveBeenCalledOnce();
    });

    it('buffers incomplete lines', () => {
      const handler = vi.fn();
      bus.on('agent:spawn', handler);

      parser.feed('Launching ag');
      expect(handler).not.toHaveBeenCalled();

      parser.feed('ent for search\n');
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('ANSI stripping', () => {
    it('strips ANSI escape codes before matching', () => {
      const handler = vi.fn();
      bus.on('mode:change', handler);
      parser.parseLine('\x1b[32mStarting presearch\x1b[0m');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'presearch' })
      );
    });
  });

  describe('no match', () => {
    it('returns null for non-matching lines', () => {
      const result = parser.parseLine('Just a normal log line');
      expect(result).toBeNull();
    });

    it('returns null for empty lines', () => {
      const result = parser.parseLine('');
      expect(result).toBeNull();
    });
  });
});
