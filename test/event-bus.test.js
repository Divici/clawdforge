import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ForgeBus, FORGE_STATE_EVENTS, CLAUDE_EVENTS } = require('../src/bridge/event-bus');

describe('ForgeBus', () => {
  it('emits and receives events', () => {
    const bus = new ForgeBus();
    const handler = vi.fn();
    bus.on('forge:state-update', handler);
    bus.emit('forge:state-update', { mode: 'presearch' });
    expect(handler).toHaveBeenCalledWith({ mode: 'presearch' });
  });

  it('supports multiple listeners', () => {
    const bus = new ForgeBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('forge:mode-change', h1);
    bus.on('forge:mode-change', h2);
    bus.emit('forge:mode-change', { mode: 'build' });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not cross-fire between event types', () => {
    const bus = new ForgeBus();
    const handler = vi.fn();
    bus.on('forge:state-update', handler);
    bus.emit('forge:mode-change', { mode: 'build' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports removeListener', () => {
    const bus = new ForgeBus();
    const handler = vi.fn();
    bus.on('forge:state-update', handler);
    bus.removeListener('forge:state-update', handler);
    bus.emit('forge:state-update', { mode: 'presearch' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('FORGE_STATE_EVENTS contains 8 event names', () => {
    expect(FORGE_STATE_EVENTS).toHaveLength(8);
  });

  it('all state events start with forge:', () => {
    for (const event of FORGE_STATE_EVENTS) {
      expect(event.startsWith('forge:')).toBe(true);
    }
  });

  it('emitting state events works', () => {
    const bus = new ForgeBus();
    const received = [];
    bus.on('forge:presearch-update', (data) => received.push(data));
    bus.emit('forge:presearch-update', { questions: [] });
    expect(received).toHaveLength(1);
    expect(received[0].questions).toEqual([]);
  });

  it('CLAUDE_EVENTS contains 8 event names', () => {
    expect(CLAUDE_EVENTS).toHaveLength(8);
  });

  it('all claude events start with claude:', () => {
    for (const event of CLAUDE_EVENTS) {
      expect(event.startsWith('claude:')).toBe(true);
    }
  });

  it('emitting claude events works', () => {
    const bus = new ForgeBus();
    const received = [];
    bus.on('claude:tool-use', (data) => received.push(data));
    bus.emit('claude:tool-use', { name: 'Read', input: { file_path: '/tmp/x' } });
    expect(received).toHaveLength(1);
    expect(received[0].name).toBe('Read');
  });
});
