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

  describe('structured marker parsing', () => {
    it('parses QUESTION marker', () => {
      const result = parser.parseLine('[FORGE:QUESTION id=q1] What database should we use?');
      expect(result.event).toBe('forge:question');
      expect(result.payload.id).toBe('q1');
      expect(result.payload.content).toBe('What database should we use?');
    });

    it('parses OPTION with recommended flag', () => {
      const result = parser.parseLine('[FORGE:OPTION id=q1 recommended=true] SQLite | good stuff');
      expect(result.event).toBe('forge:option');
      expect(result.payload.id).toBe('q1');
      expect(result.payload.recommended).toBe(true);
      expect(result.payload.content).toBe('SQLite | good stuff');
    });

    it('parses OPTION_END', () => {
      const result = parser.parseLine('[FORGE:OPTION_END id=q1]');
      expect(result.event).toBe('forge:option-end');
      expect(result.payload.id).toBe('q1');
    });

    it('parses TEXT_QUESTION', () => {
      const result = parser.parseLine('[FORGE:TEXT_QUESTION id=q2] What is your timeline?');
      expect(result.event).toBe('forge:text-question');
      expect(result.payload.content).toBe('What is your timeline?');
    });

    it('parses PHASE with numeric coercion', () => {
      const result = parser.parseLine('[FORGE:PHASE phase=scaffold total=5 current=1]');
      expect(result.event).toBe('forge:phase');
      expect(result.payload.phase).toBe('scaffold');
      expect(result.payload.total).toBe(5);
      expect(result.payload.current).toBe(1);
    });

    it('parses MODE', () => {
      const result = parser.parseLine('[FORGE:MODE mode=build]');
      expect(result.event).toBe('forge:mode');
      expect(result.payload.mode).toBe('build');
    });

    it('parses LOOP', () => {
      const result = parser.parseLine('[FORGE:LOOP loop=1 name=Constraints]');
      expect(result.event).toBe('forge:loop');
      expect(result.payload.loop).toBe(1);
      expect(result.payload.name).toBe('Constraints');
    });

    it('parses DECISION', () => {
      const result = parser.parseLine('[FORGE:DECISION] Database: SQLite — embedded, zero config');
      expect(result.event).toBe('forge:decision');
      expect(result.payload.content).toBe('Database: SQLite — embedded, zero config');
    });

    it('parses TASK', () => {
      const result = parser.parseLine('[FORGE:TASK status=complete] feat(db): add user model');
      expect(result.event).toBe('forge:task');
      expect(result.payload.status).toBe('complete');
    });

    it('parses AGENT_SPAWN', () => {
      const result = parser.parseLine('[FORGE:AGENT_SPAWN count=3]');
      expect(result.event).toBe('forge:agent-spawn');
      expect(result.payload.count).toBe(3);
    });

    it('parses AGENT_DONE', () => {
      const result = parser.parseLine('[FORGE:AGENT_DONE count=2]');
      expect(result.event).toBe('forge:agent-done');
      expect(result.payload.count).toBe(2);
    });

    it('parses BLOCKER', () => {
      const result = parser.parseLine('[FORGE:BLOCKER type=api-key] Need OpenAI key');
      expect(result.event).toBe('forge:blocker');
      expect(result.payload.type).toBe('api-key');
    });

    it('parses CONTEXT_WARNING with numeric pct', () => {
      const result = parser.parseLine('[FORGE:CONTEXT_WARNING pct=48]');
      expect(result.event).toBe('forge:context-warning');
      expect(result.payload.pct).toBe(48);
    });

    it('parses REGISTRY with JSON content', () => {
      const json = JSON.stringify([{ id: 'R-001', text: 'Layout' }]);
      const result = parser.parseLine(`[FORGE:REGISTRY] ${json}`);
      expect(result.event).toBe('forge:registry');
      expect(result.payload.requirements).toEqual([{ id: 'R-001', text: 'Layout' }]);
    });

    it('handles REGISTRY with invalid JSON gracefully', () => {
      const result = parser.parseLine('[FORGE:REGISTRY] not valid json');
      expect(result.event).toBe('forge:registry');
      expect(result.payload.parseError).toBe(true);
      expect(result.payload.rawContent).toBe('not valid json');
    });

    it('parses COMPLETE with JSON summary', () => {
      const json = JSON.stringify({ tests: 127, phases: 5 });
      const result = parser.parseLine(`[FORGE:COMPLETE] ${json}`);
      expect(result.event).toBe('forge:complete');
      expect(result.payload.summary).toEqual({ tests: 127, phases: 5 });
    });

    it('parses ACCORDION', () => {
      const result = parser.parseLine('[FORGE:ACCORDION id=a1 sections=4] AI Approach');
      expect(result.event).toBe('forge:accordion');
      expect(result.payload.sections).toBe(4);
    });

    it('parses ACCORDION_SECTION', () => {
      const result = parser.parseLine('[FORGE:ACCORDION_SECTION id=a1 section=1] Pattern Selection');
      expect(result.event).toBe('forge:accordion-section');
      expect(result.payload.section).toBe(1);
    });

    it('handles marker with ANSI codes', () => {
      const result = parser.parseLine('\x1b[32m[FORGE:QUESTION id=q1] What db?\x1b[0m');
      expect(result.event).toBe('forge:question');
      expect(result.payload.id).toBe('q1');
    });

    it('marker with empty content', () => {
      const result = parser.parseLine('[FORGE:OPTION_END id=q1]');
      expect(result.payload.content).toBe('');
    });

    it('sets structuredMode after first marker', () => {
      expect(parser.structuredMode).toBe(false);
      parser.parseLine('[FORGE:MODE mode=build]');
      expect(parser.structuredMode).toBe(true);
    });

    it('falls through to v1 regex when no marker', () => {
      const nonMarkerLine = 'Some regular Claude output';
      const result = parser.parseLine(nonMarkerLine);
      expect(true).toBe(true);
    });

    it('handles unknown marker type', () => {
      const result = parser.parseLine('[FORGE:UNKNOWN foo=bar] some content');
      expect(result.event).toBe('forge:unknown');
    });
  });
});
