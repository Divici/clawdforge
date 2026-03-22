import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ForgeLog, DEFAULT_LOG } = require('../src/bridge/forge-log');

let tmpDir;
let log;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-log-test-'));
  log = new ForgeLog(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ForgeLog', () => {
  it('load returns default when file does not exist', () => {
    const data = log.load();
    expect(data.mode).toBe('launch');
    expect(data.presearchDecisions).toEqual([]);
    expect(data.buildCards).toEqual([]);
  });

  it('load reads existing valid JSON', () => {
    const existing = { ...DEFAULT_LOG, projectName: 'test-project', mode: 'build' };
    fs.writeFileSync(path.join(tmpDir, 'forge-log.json'), JSON.stringify(existing));
    const data = log.load();
    expect(data.projectName).toBe('test-project');
    expect(data.mode).toBe('build');
  });

  it('load returns default on corrupt JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'forge-log.json'), 'not json!!!');
    const data = log.load();
    expect(data.mode).toBe('launch');
  });

  it('save writes valid JSON to disk', () => {
    log.load();
    log._data.projectName = 'saved-project';
    log.save();
    const raw = fs.readFileSync(path.join(tmpDir, 'forge-log.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.projectName).toBe('saved-project');
  });

  it('addPresearchDecision appends and persists', () => {
    log.load();
    log.addPresearchDecision({ id: 'q1', question: 'DB?', answer: 'SQLite' });
    const reloaded = new ForgeLog(tmpDir).load();
    expect(reloaded.presearchDecisions).toHaveLength(1);
    expect(reloaded.presearchDecisions[0].answer).toBe('SQLite');
  });

  it('addBuildCard appends and persists', () => {
    log.load();
    log.addBuildCard({ type: 'task', title: 'bootstrap' });
    const reloaded = new ForgeLog(tmpDir).load();
    expect(reloaded.buildCards).toHaveLength(1);
    expect(reloaded.buildCards[0].title).toBe('bootstrap');
  });

  it('updatePhase updates fields', () => {
    log.load();
    log.updatePhase('auth', 2, 5, ['scaffold', 'auth', 'api', 'deploy', 'polish']);
    const reloaded = new ForgeLog(tmpDir).load();
    expect(reloaded.currentPhase).toBe('auth');
    expect(reloaded.totalPhases).toBe(5);
    expect(reloaded.phaseNames).toHaveLength(5);
  });

  it('updateMode updates mode field', () => {
    log.load();
    log.updateMode('build');
    const reloaded = new ForgeLog(tmpDir).load();
    expect(reloaded.mode).toBe('build');
  });

  it('round-trip: save then load returns identical data', () => {
    const original = {
      ...DEFAULT_LOG,
      projectName: 'roundtrip',
      startTime: '2026-03-21T10:00:00Z',
      mode: 'build',
      presearchDecisions: [{ id: 'q1', answer: 'SQLite' }],
      buildCards: [{ type: 'task', title: 'bootstrap' }],
      currentPhase: 'scaffold',
      totalPhases: 5,
      phaseNames: ['scaffold', 'auth'],
    };
    log.save(original);
    const reloaded = new ForgeLog(tmpDir).load();
    expect(reloaded).toEqual(original);
  });

  it('getLogPath returns correct path', () => {
    expect(log.getLogPath()).toBe(path.join(tmpDir, 'forge-log.json'));
  });

  it('multiple addBuildCard calls accumulate', () => {
    log.load();
    log.addBuildCard({ type: 'task', title: 'first' });
    log.addBuildCard({ type: 'task', title: 'second' });
    const reloaded = new ForgeLog(tmpDir).load();
    expect(reloaded.buildCards).toHaveLength(2);
  });
});
