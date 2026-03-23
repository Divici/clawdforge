import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ForgeBus, FORGE_EVENTS_V2, CLAUDE_EVENTS } = require('../src/bridge/event-bus');

describe('ForgeBus', () => {
  it('emits and receives events', () => {
    const bus = new ForgeBus();
    const handler = vi.fn();
    bus.on('stage:change', handler);
    bus.emit('stage:change', { stage: 'build' });
    expect(handler).toHaveBeenCalledWith({ stage: 'build' });
  });

  it('supports multiple listeners', () => {
    const bus = new ForgeBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('agent:spawn', h1);
    bus.on('agent:spawn', h2);
    bus.emit('agent:spawn', { name: 'test' });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not cross-fire between event types', () => {
    const bus = new ForgeBus();
    const handler = vi.fn();
    bus.on('stage:change', handler);
    bus.emit('agent:spawn', { name: 'test' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports removeListener', () => {
    const bus = new ForgeBus();
    const handler = vi.fn();
    bus.on('warning', handler);
    bus.removeListener('warning', handler);
    bus.emit('warning', { text: 'test' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('FORGE_EVENTS_V2 contains 17 event names', () => {
    expect(FORGE_EVENTS_V2).toHaveLength(17);
  });

  it('all v2 events start with forge:', () => {
    for (const event of FORGE_EVENTS_V2) {
      expect(event.startsWith('forge:')).toBe(true);
    }
  });

  it('emitting v2 events works', () => {
    const bus = new ForgeBus();
    const received = [];
    bus.on('forge:question', (data) => received.push(data));
    bus.emit('forge:question', { id: 'q1', content: 'What db?' });
    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('q1');
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
