import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/preact';
import { h } from 'preact';
import { useForgeState } from '../../src/hooks/useForgeState';

function TestComponent({ onRender }) {
  const result = useForgeState();
  onRender(result);
  return h('div', null, 'test');
}

describe('useForgeState', () => {
  let callbacks;
  let originalForgeAPI;

  beforeEach(() => {
    callbacks = {};
    originalForgeAPI = window.forgeAPI;
    window.forgeAPI = {
      onStateUpdate: vi.fn((cb) => { callbacks.state = cb; }),
      onPresearchUpdate: vi.fn((cb) => { callbacks.presearch = cb; }),
      onBuildUpdate: vi.fn((cb) => { callbacks.build = cb; }),
    };
  });

  afterEach(() => {
    window.forgeAPI = originalForgeAPI;
  });

  it('returns null for all values initially', () => {
    let result;
    render(h(TestComponent, { onRender: (r) => { result = r; } }));
    expect(result.state).toBeNull();
    expect(result.presearch).toBeNull();
    expect(result.build).toBeNull();
  });

  it('subscribes to forgeAPI state channels on mount', () => {
    render(h(TestComponent, { onRender: () => {} }));
    expect(window.forgeAPI.onStateUpdate).toHaveBeenCalledOnce();
    expect(window.forgeAPI.onPresearchUpdate).toHaveBeenCalledOnce();
    expect(window.forgeAPI.onBuildUpdate).toHaveBeenCalledOnce();
  });

  it('updates state when onStateUpdate fires', () => {
    let result;
    render(h(TestComponent, { onRender: (r) => { result = r; } }));

    const stateData = { mode: 'presearch', status: 'running' };
    act(() => { callbacks.state(stateData); });

    expect(result.state).toEqual(stateData);
  });

  it('updates presearch when onPresearchUpdate fires', () => {
    let result;
    render(h(TestComponent, { onRender: (r) => { result = r; } }));

    const psData = { questions: [{ id: 'q1' }] };
    act(() => { callbacks.presearch(psData); });

    expect(result.presearch).toEqual(psData);
  });

  it('updates build when onBuildUpdate fires', () => {
    let result;
    render(h(TestComponent, { onRender: (r) => { result = r; } }));

    const buildData = { phases: [{ name: 'scaffold' }] };
    act(() => { callbacks.build(buildData); });

    expect(result.build).toEqual(buildData);
  });

  it('handles missing forgeAPI gracefully', () => {
    window.forgeAPI = undefined;
    let result;
    expect(() => {
      render(h(TestComponent, { onRender: (r) => { result = r; } }));
    }).not.toThrow();
    expect(result.state).toBeNull();
  });
});
