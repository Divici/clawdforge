import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ForgeStateWatcher } from '../src/bridge/forge-state-watcher.js';

// Helper to create a mock bus
function createMockBus() {
  const events = {};
  return {
    emit(event, payload) {
      if (!events[event]) events[event] = [];
      events[event].push(payload);
    },
    getEvents(event) {
      return events[event] || [];
    },
    getAllEvents() {
      return events;
    },
  };
}

// Helper to create temp .forge/ dir with files
function createForgeDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-test-'));
  const forgeDir = path.join(tmpDir, '.forge');
  fs.mkdirSync(forgeDir, { recursive: true });
  return { tmpDir, forgeDir };
}

function writeJSON(forgeDir, filename, data) {
  fs.writeFileSync(path.join(forgeDir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

describe('ForgeStateWatcher', () => {
  let bus;
  let tmpDir;
  let forgeDir;
  let watcher;

  beforeEach(() => {
    bus = createMockBus();
    ({ tmpDir, forgeDir } = createForgeDir());
  });

  afterEach(() => {
    if (watcher) watcher.stop();
    cleanup(tmpDir);
  });

  describe('constructor', () => {
    it('accepts bus, forgeDir, and interval', () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 100);
      expect(watcher).toBeDefined();
      expect(watcher.interval).toBe(100);
    });

    it('defaults interval to 500ms', () => {
      watcher = new ForgeStateWatcher(bus, forgeDir);
      expect(watcher.interval).toBe(500);
    });
  });

  describe('start/stop', () => {
    it('starts polling and can be stopped', () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 50);
      watcher.start();
      expect(watcher._timer).not.toBeNull();
      watcher.stop();
      expect(watcher._timer).toBeNull();
    });

    it('stop is safe to call multiple times', () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 50);
      watcher.start();
      watcher.stop();
      watcher.stop(); // no throw
      expect(watcher._timer).toBeNull();
    });

    it('stop is safe to call without start', () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 50);
      watcher.stop(); // no throw
    });
  });

  describe('file detection', () => {
    it('emits forge:state-update when state.json appears', async () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      // No file yet — no events
      await delay(50);
      expect(bus.getEvents('forge:state-update')).toHaveLength(0);

      // Write state.json
      const state = makeState({ mode: 'presearch', status: 'running' });
      writeJSON(forgeDir, 'state.json', state);

      await delay(80);
      const events = bus.getEvents('forge:state-update');
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].mode).toBe('presearch');
    });

    it('emits forge:presearch-update when presearch-state.json appears', async () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      const ps = { version: 1, requirements: [], questions: [], decisions: [] };
      writeJSON(forgeDir, 'presearch-state.json', ps);

      await delay(80);
      const events = bus.getEvents('forge:presearch-update');
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].questions).toEqual([]);
    });

    it('emits forge:build-update when build-state.json appears', async () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      const bs = { version: 1, phases: [], agents: { active: 0, totalSpawned: 0, totalCompleted: 0 }, summary: null };
      writeJSON(forgeDir, 'build-state.json', bs);

      await delay(80);
      const events = bus.getEvents('forge:build-update');
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].phases).toEqual([]);
    });

    it('handles missing files gracefully (no crash)', async () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      // No files exist — should just not emit
      await delay(80);
      expect(bus.getEvents('forge:state-update')).toHaveLength(0);
    });
  });

  describe('change detection', () => {
    it('does not re-emit when file content is unchanged', async () => {
      const state = makeState({ mode: 'presearch', status: 'running' });
      writeJSON(forgeDir, 'state.json', state);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      await delay(80);
      const count1 = bus.getEvents('forge:state-update').length;
      expect(count1).toBe(1);

      // Wait more poll cycles without changing file
      await delay(100);
      const count2 = bus.getEvents('forge:state-update').length;
      expect(count2).toBe(1); // still 1 — no re-emit
    });

    it('emits again when file content changes', async () => {
      const state1 = makeState({ mode: 'presearch', status: 'running', currentLoop: 1 });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      await delay(80);
      expect(bus.getEvents('forge:state-update')).toHaveLength(1);

      // Update file
      const state2 = makeState({ mode: 'presearch', status: 'running', currentLoop: 2 });
      writeJSON(forgeDir, 'state.json', state2);

      await delay(80);
      const events = bus.getEvents('forge:state-update');
      expect(events.length).toBe(2);
      expect(events[1].presearch.currentLoop).toBe(2);
    });

    it('handles malformed JSON gracefully (retries on next poll)', async () => {
      // Write invalid JSON
      fs.writeFileSync(path.join(forgeDir, 'state.json'), '{ broken json', 'utf-8');

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();

      await delay(80);
      expect(bus.getEvents('forge:state-update')).toHaveLength(0); // skipped

      // Fix it
      writeJSON(forgeDir, 'state.json', makeState({ mode: 'presearch' }));
      await delay(80);
      expect(bus.getEvents('forge:state-update').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('granular diff events', () => {
    it('emits forge:mode-change when mode changes', async () => {
      const state1 = makeState({ mode: 'presearch' });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      // Change mode
      const state2 = makeState({ mode: 'build' });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      const events = bus.getEvents('forge:mode-change');
      expect(events.length).toBe(1);
      expect(events[0].mode).toBe('build');
    });

    it('does not emit forge:mode-change when mode stays the same', async () => {
      const state1 = makeState({ mode: 'presearch', currentLoop: 1 });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      // Change loop but not mode
      const state2 = makeState({ mode: 'presearch', currentLoop: 2 });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      expect(bus.getEvents('forge:mode-change')).toHaveLength(0);
    });

    it('emits forge:status-change when status changes', async () => {
      const state1 = makeState({ status: 'running' });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      const state2 = makeState({ status: 'waiting_for_input' });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      const events = bus.getEvents('forge:status-change');
      expect(events.length).toBe(1);
      expect(events[0].status).toBe('waiting_for_input');
    });

    it('emits forge:loop-change when presearch loop advances', async () => {
      const state1 = makeState({ currentLoop: 1, currentLoopName: 'Constraints' });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      const state2 = makeState({ currentLoop: 2, currentLoopName: 'Discovery' });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      const events = bus.getEvents('forge:loop-change');
      expect(events.length).toBe(1);
      expect(events[0].loop).toBe(2);
      expect(events[0].name).toBe('Discovery');
    });

    it('emits forge:waiting-for-input when waitingForInput becomes true', async () => {
      const state1 = makeState({ waitingForInput: false });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      const state2 = makeState({ waitingForInput: true, inputRequestId: 'q1' });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      const events = bus.getEvents('forge:waiting-for-input');
      expect(events.length).toBe(1);
      expect(events[0].requestId).toBe('q1');
    });

    it('does not emit forge:waiting-for-input when already waiting', async () => {
      const state1 = makeState({ waitingForInput: true, inputRequestId: 'q1' });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      // Update something else while still waiting
      const state2 = makeState({ waitingForInput: true, inputRequestId: 'q1', currentLoop: 2 });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      // Should not re-emit since waitingForInput was already true
      expect(bus.getEvents('forge:waiting-for-input')).toHaveLength(0);
    });

    it('emits forge:phase-change when build phase changes', async () => {
      const state1 = makeState({ mode: 'build', buildCurrentPhase: 'scaffold' });
      writeJSON(forgeDir, 'state.json', state1);

      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      await delay(80);

      const state2 = makeState({ mode: 'build', buildCurrentPhase: 'api-core', buildCompletedPhases: ['scaffold'] });
      writeJSON(forgeDir, 'state.json', state2);
      await delay(80);

      const events = bus.getEvents('forge:phase-change');
      expect(events.length).toBe(1);
      expect(events[0].phase).toBe('api-core');
      expect(events[0].completedPhases).toEqual(['scaffold']);
    });
  });

  describe('cleanup', () => {
    it('clears timer on stop', () => {
      watcher = new ForgeStateWatcher(bus, forgeDir, 30);
      watcher.start();
      expect(watcher._timer).not.toBeNull();
      watcher.stop();
      expect(watcher._timer).toBeNull();
    });
  });
});

// --- Helpers ---

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeState({
  mode = 'presearch',
  status = 'running',
  currentLoop = 1,
  currentLoopName = 'Constraints',
  waitingForInput = false,
  inputRequestId = null,
  buildCurrentPhase = null,
  buildCompletedPhases = [],
} = {}) {
  return {
    version: 1,
    mode,
    status,
    sessionId: 'test-session',
    projectName: 'test-project',
    startedAt: '2026-03-23T10:00:00Z',
    updatedAt: new Date().toISOString(),
    runMode: 'autonomous',
    presearch: {
      status: mode === 'presearch' ? 'running' : 'complete',
      currentLoop,
      currentLoopName,
      completedLoops: [],
      totalLoops: 5,
      waitingForInput,
      inputRequestId,
    },
    build: {
      status: mode === 'build' ? 'running' : 'idle',
      phases: [],
      currentPhase: buildCurrentPhase,
      completedPhases: buildCompletedPhases,
      tasksTotal: 0,
      tasksCompleted: 0,
      activeAgents: 0,
      blockers: [],
    },
    cost: { totalUsd: 0, turns: 0 },
    error: null,
  };
}
