import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ForgeStateWatcher } from '../../src/bridge/forge-state-watcher.js';
import { validateForgeState } from '../../src/bridge/gate-check.js';

function createMockBus() {
  const events = {};
  return {
    emit(event, payload) {
      if (!events[event]) events[event] = [];
      events[event].push(payload);
    },
    getEvents(event) { return events[event] || []; },
  };
}

function createForgeDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-test-'));
  const forgeDir = path.join(tmpDir, '.forge');
  fs.mkdirSync(forgeDir, { recursive: true });
  return { tmpDir, forgeDir };
}

function writeJSON(dir, filename, data) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Disk-state integration: autonomous presearch flow', () => {
  let bus, tmpDir, forgeDir, watcher;

  beforeEach(() => {
    bus = createMockBus();
    ({ tmpDir, forgeDir } = createForgeDir());
  });

  afterEach(() => {
    if (watcher) watcher.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('simulates full autonomous presearch → build transition', async () => {
    watcher = new ForgeStateWatcher(bus, forgeDir, 30);
    watcher.start();

    // Step 1: Claude writes initial presearch state
    writeJSON(forgeDir, 'state.json', {
      version: 1, mode: 'presearch', status: 'running', updatedAt: new Date().toISOString(),
      runMode: 'autonomous',
      presearch: { status: 'running', currentLoop: 1, currentLoopName: 'Constraints', completedLoops: [], totalLoops: 5, waitingForInput: false, inputRequestId: null },
      build: { status: 'idle', phases: [], currentPhase: null, completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, blockers: [] },
      cost: { totalUsd: 0, turns: 0 }, error: null,
    });
    writeJSON(forgeDir, 'presearch-state.json', {
      version: 1, requirements: [], questions: [], decisions: [],
    });

    // Gate check should pass
    expect(validateForgeState(forgeDir)).toEqual([]);
    await delay(80);
    expect(bus.getEvents('forge:state-update').length).toBe(1);

    // Step 2: Claude adds questions (answered in autonomous mode)
    writeJSON(forgeDir, 'presearch-state.json', {
      version: 1,
      requirements: [{ id: 'R-001', text: 'Must work offline', source: 'PRD', category: 'Functional', priority: 'Must-have' }],
      questions: [
        { id: 'q1', loop: 1, loopName: 'Constraints', type: 'choice', question: 'Database?',
          options: [{ name: 'SQLite', pros: ['Fast'], cons: ['Limited'], bestWhen: 'local', recommended: true }],
          status: 'answered', answer: 'SQLite', answeredAt: new Date().toISOString() },
      ],
      decisions: [{ id: 'd1', loop: 1, summary: 'Database: SQLite', questionId: 'q1', decidedAt: new Date().toISOString() }],
    });
    await delay(80);
    const psUpdates = bus.getEvents('forge:presearch-update');
    expect(psUpdates.length).toBe(2);
    expect(psUpdates[1].questions[0].status).toBe('answered');

    // Step 3: Claude advances to loop 2
    writeJSON(forgeDir, 'state.json', {
      version: 1, mode: 'presearch', status: 'running', updatedAt: new Date().toISOString(),
      runMode: 'autonomous',
      presearch: { status: 'running', currentLoop: 2, currentLoopName: 'Discovery', completedLoops: ['Constraints'], totalLoops: 5, waitingForInput: false, inputRequestId: null },
      build: { status: 'idle', phases: [], currentPhase: null, completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, blockers: [] },
      cost: { totalUsd: 0.05, turns: 1 }, error: null,
    });
    await delay(80);
    expect(bus.getEvents('forge:loop-change').length).toBe(1);
    expect(bus.getEvents('forge:loop-change')[0].name).toBe('Discovery');

    // Step 4: Claude transitions to build
    writeJSON(forgeDir, 'state.json', {
      version: 1, mode: 'build', status: 'running', updatedAt: new Date().toISOString(),
      runMode: 'autonomous',
      presearch: { status: 'complete', currentLoop: 5, currentLoopName: 'GapAnalysis', completedLoops: ['Constraints', 'Discovery', 'Refinement', 'Plan', 'GapAnalysis'], totalLoops: 5, waitingForInput: false, inputRequestId: null },
      build: { status: 'running', phases: ['scaffold', 'api'], currentPhase: 'scaffold', completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, blockers: [] },
      cost: { totalUsd: 0.10, turns: 5 }, error: null,
    });
    writeJSON(forgeDir, 'build-state.json', {
      version: 1,
      phases: [{ name: 'scaffold', status: 'in_progress', tasks: [] }, { name: 'api', status: 'pending', tasks: [] }],
      agents: { active: 0, totalSpawned: 0, totalCompleted: 0 }, summary: null,
    });
    await delay(80);
    expect(bus.getEvents('forge:mode-change').length).toBe(1);
    expect(bus.getEvents('forge:mode-change')[0].mode).toBe('build');
    expect(bus.getEvents('forge:build-update').length).toBe(1);
    expect(validateForgeState(forgeDir)).toEqual([]);
  });
});

describe('Disk-state integration: interactive presearch flow', () => {
  let bus, tmpDir, forgeDir, watcher;

  beforeEach(() => {
    bus = createMockBus();
    ({ tmpDir, forgeDir } = createForgeDir());
  });

  afterEach(() => {
    if (watcher) watcher.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('simulates interactive pause → user answer → resume cycle', async () => {
    watcher = new ForgeStateWatcher(bus, forgeDir, 30);
    watcher.start();

    // Step 1: Claude writes pending question and sets waitingForInput
    writeJSON(forgeDir, 'state.json', {
      version: 1, mode: 'presearch', status: 'waiting_for_input', updatedAt: new Date().toISOString(),
      runMode: 'interactive',
      presearch: { status: 'running', currentLoop: 1, currentLoopName: 'Constraints', completedLoops: [], totalLoops: 5, waitingForInput: true, inputRequestId: 'q1' },
      build: { status: 'idle', phases: [], currentPhase: null, completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, blockers: [] },
      cost: { totalUsd: 0, turns: 0 }, error: null,
    });
    writeJSON(forgeDir, 'presearch-state.json', {
      version: 1, requirements: [],
      questions: [{ id: 'q1', loop: 1, loopName: 'Constraints', type: 'choice', question: 'Database?',
        options: [{ name: 'SQLite', pros: ['Fast'], cons: ['Limited'], recommended: true }],
        status: 'pending', answer: null, answeredAt: null }],
      decisions: [],
    });
    await delay(80);

    // Gate check should PASS (no longer blocks on waiting_for_input — dashboard resumes Claude)
    const errors1 = validateForgeState(forgeDir);
    expect(errors1).toEqual([]);

    // Watcher should emit waiting-for-input
    // (first state write won't emit since there's no prev, but let's update to trigger)
    writeJSON(forgeDir, 'state.json', {
      version: 1, mode: 'presearch', status: 'waiting_for_input', updatedAt: new Date().toISOString(),
      runMode: 'interactive',
      presearch: { status: 'running', currentLoop: 1, currentLoopName: 'Constraints', completedLoops: [], totalLoops: 5, waitingForInput: true, inputRequestId: 'q1' },
      build: { status: 'idle', phases: [], currentPhase: null, completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, blockers: [] },
      cost: { totalUsd: 0.01, turns: 1 }, error: null, // changed cost to trigger update
    });
    await delay(80);

    // Step 2: User answers via dashboard → writeUserInput
    writeJSON(forgeDir, 'user-input.json', {
      version: 1, requestId: 'q1', answer: 'SQLite', answeredAt: new Date().toISOString(),
    });

    // Gate check should now PASS
    const errors2 = validateForgeState(forgeDir);
    expect(errors2).toEqual([]);

    // Step 3: Claude reads answer, updates state, continues
    writeJSON(forgeDir, 'state.json', {
      version: 1, mode: 'presearch', status: 'running', updatedAt: new Date().toISOString(),
      runMode: 'interactive',
      presearch: { status: 'running', currentLoop: 1, currentLoopName: 'Constraints', completedLoops: [], totalLoops: 5, waitingForInput: false, inputRequestId: null },
      build: { status: 'idle', phases: [], currentPhase: null, completedPhases: [], tasksTotal: 0, tasksCompleted: 0, activeAgents: 0, blockers: [] },
      cost: { totalUsd: 0.02, turns: 2 }, error: null,
    });
    writeJSON(forgeDir, 'presearch-state.json', {
      version: 1, requirements: [],
      questions: [{ id: 'q1', loop: 1, loopName: 'Constraints', type: 'choice', question: 'Database?',
        options: [{ name: 'SQLite', pros: ['Fast'], cons: ['Limited'], recommended: true }],
        status: 'answered', answer: 'SQLite', answeredAt: new Date().toISOString() }],
      decisions: [{ id: 'd1', loop: 1, summary: 'Database: SQLite', questionId: 'q1', decidedAt: new Date().toISOString() }],
    });
    await delay(80);

    // Status should have changed back to running
    const statusChanges = bus.getEvents('forge:status-change');
    expect(statusChanges.some(e => e.status === 'running')).toBe(true);
  });
});
