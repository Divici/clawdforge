import { describe, it, expect, vi, beforeEach } from 'vitest';

// State machine logic tests (without canvas rendering)
// We test the state transitions directly

describe('Orchestrator state machine', () => {
  let orchestrator;

  beforeEach(async () => {
    // Mock Image and canvas APIs for Node.js environment
    globalThis.Image = class { set onload(fn) { } set onerror(fn) { fn(); } set src(v) { } };
    globalThis.OffscreenCanvas = class { getContext() { return { drawImage() {}, fillRect() {}, set imageSmoothingEnabled(v) {}, set globalCompositeOperation(v) {}, set fillStyle(v) {} }; } };

    const mod = await import('../src/forge/orchestrator.js');
    orchestrator = new mod.Orchestrator();
  });

  it('starts in idle state', () => {
    expect(orchestrator.state).toBe('idle');
  });

  it('transitions to dispatching', () => {
    orchestrator.setState('dispatching');
    expect(orchestrator.state).toBe('dispatching');
  });

  it('transitions to complete', () => {
    orchestrator.setState('dispatching');
    orchestrator.setState('complete');
    expect(orchestrator.state).toBe('complete');
  });

  it('transitions to error', () => {
    orchestrator.setState('error');
    expect(orchestrator.state).toBe('error');
  });

  it('ignores invalid states', () => {
    orchestrator.setState('invalid');
    expect(orchestrator.state).toBe('idle');
  });

  it('updates pulse phase', () => {
    const before = orchestrator.pulsePhase;
    orchestrator.update();
    expect(orchestrator.pulsePhase).toBeGreaterThan(before);
  });
});

describe('ForgeCore state machine', () => {
  let forge;

  beforeEach(async () => {
    const mod = await import('../src/forge/forge-core.js');
    forge = new mod.ForgeCore();
  });

  it('starts in cold state', () => {
    expect(forge.state).toBe('cold');
  });

  it('transitions to active', () => {
    forge.setState('active');
    expect(forge.state).toBe('active');
  });

  it('transitions to cooling', () => {
    forge.setState('active');
    forge.setState('cooling');
    expect(forge.state).toBe('cooling');
  });

  it('ignores invalid states', () => {
    forge.setState('molten');
    expect(forge.state).toBe('cold');
  });
});

describe('SubagentManager state machine', () => {
  let manager;

  beforeEach(async () => {
    globalThis.Image = class { set onload(fn) { } set onerror(fn) { fn(); } set src(v) { } };
    globalThis.OffscreenCanvas = class { getContext() { return { drawImage() {}, fillRect() {}, set imageSmoothingEnabled(v) {}, set globalCompositeOperation(v) {}, set fillStyle(v) {} }; } };

    const mod = await import('../src/forge/subagent.js');
    manager = new mod.SubagentManager();
    manager.resize(800, 600);
  });

  it('starts with no pods', () => {
    expect(manager.pods.length).toBe(0);
    expect(manager.totalAgents).toBe(0);
  });

  it('spawns a pod in spawning state', () => {
    manager.spawnPod();
    expect(manager.pods.length).toBe(1);
    expect(manager.pods[0].state).toBe('spawning');
    expect(manager.totalAgents).toBe(1);
  });

  it('limits display to MAX_DISPLAY (6)', () => {
    for (let i = 0; i < 8; i++) manager.spawnPod();
    expect(manager.pods.length).toBe(6);
    expect(manager.totalAgents).toBe(8);
  });

  it('completes a working pod', () => {
    manager.spawnPod();
    manager.pods[0].state = 'working'; // Skip spawn animation
    manager.completePod();
    expect(manager.pods[0].state).toBe('done');
  });

  it('sets all pods to done', () => {
    manager.spawnPod();
    manager.spawnPod();
    manager.pods[0].state = 'working';
    manager.pods[1].state = 'working';
    manager.setAllDone();
    expect(manager.pods.every((p) => p.state === 'done')).toBe(true);
  });

  it('sets working/spawning pods to error', () => {
    manager.spawnPod();
    manager.spawnPod();
    manager.pods[0].state = 'working';
    manager.pods[1].state = 'done';
    manager.setAllError();
    expect(manager.pods[0].state).toBe('error');
    expect(manager.pods[1].state).toBe('done'); // done stays done
  });
});
