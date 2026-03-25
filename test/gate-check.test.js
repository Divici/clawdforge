import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateForgeState } from '../src/bridge/gate-check.js';

function createForgeDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-test-'));
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

describe('gate-check: validateForgeState', () => {
  let tmpDir;
  let forgeDir;

  beforeEach(() => {
    ({ tmpDir, forgeDir } = createForgeDir());
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('state.json validation', () => {
    it('returns error when state.json is missing', () => {
      const errors = validateForgeState(forgeDir);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/state\.json/i);
    });

    it('returns error when state.json is invalid JSON', () => {
      fs.writeFileSync(path.join(forgeDir, 'state.json'), 'not json', 'utf-8');
      const errors = validateForgeState(forgeDir);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/state\.json/i);
    });

    it('returns error when state.json missing "mode" field', () => {
      writeJSON(forgeDir, 'state.json', { status: 'running', updatedAt: '2026-01-01T00:00:00Z' });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('mode'))).toBe(true);
    });

    it('returns error when state.json missing "status" field', () => {
      writeJSON(forgeDir, 'state.json', { mode: 'presearch', updatedAt: '2026-01-01T00:00:00Z' });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('status'))).toBe(true);
    });

    it('returns error when state.json missing "updatedAt" field', () => {
      writeJSON(forgeDir, 'state.json', { mode: 'presearch', status: 'running' });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('updatedAt'))).toBe(true);
    });

    it('passes when state.json has all required fields and mode is complete', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'complete',
        status: 'complete',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });
  });

  describe('presearch mode validation', () => {
    it('returns error when presearch-state.json is missing during presearch mode', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('presearch-state.json'))).toBe(true);
    });

    it('returns error when presearch-state.json missing "questions" array', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      writeJSON(forgeDir, 'presearch-state.json', { version: 1 });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('questions'))).toBe(true);
    });

    it('passes when presearch files are valid', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      writeJSON(forgeDir, 'presearch-state.json', {
        version: 1,
        requirements: [],
        questions: [],
        decisions: [],
      });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });
  });

  describe('build mode validation', () => {
    it('returns error when build-state.json is missing during build mode', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'build',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('build-state.json'))).toBe(true);
    });

    it('returns error when build-state.json missing "phases" array', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'build',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      writeJSON(forgeDir, 'build-state.json', { version: 1 });
      const errors = validateForgeState(forgeDir);
      expect(errors.some(e => e.includes('phases'))).toBe(true);
    });

    it('passes when build files are valid', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'build',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      writeJSON(forgeDir, 'build-state.json', {
        version: 1,
        phases: [],
        agents: { active: 0, totalSpawned: 0, totalCompleted: 0 },
        summary: null,
      });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });
  });

  describe('interactive mode: waiting_for_input check', () => {
    it('passes (no blocking) when waitingForInput=true and no user-input.json', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'waiting_for_input',
        updatedAt: '2026-01-01T00:00:00Z',
        presearch: { waitingForInput: true, inputRequestId: 'q1' },
      });
      writeJSON(forgeDir, 'presearch-state.json', {
        version: 1,
        questions: [{ id: 'q1', status: 'pending' }],
      });
      const errors = validateForgeState(forgeDir);
      // Gate-check no longer blocks on waiting_for_input — the dashboard resumes Claude after user answers
      expect(errors).toEqual([]);
    });

    it('passes (no blocking) when user-input.json has wrong requestId', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'waiting_for_input',
        updatedAt: '2026-01-01T00:00:00Z',
        presearch: { waitingForInput: true, inputRequestId: 'q2' },
      });
      writeJSON(forgeDir, 'presearch-state.json', {
        version: 1,
        questions: [{ id: 'q2', status: 'pending' }],
      });
      writeJSON(forgeDir, 'user-input.json', {
        requestId: 'q1', // wrong ID
        answer: 'SQLite',
      });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });

    it('passes when user-input.json has matching requestId', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'waiting_for_input',
        updatedAt: '2026-01-01T00:00:00Z',
        presearch: { waitingForInput: true, inputRequestId: 'q2' },
      });
      writeJSON(forgeDir, 'presearch-state.json', {
        version: 1,
        questions: [{ id: 'q2', status: 'pending' }],
      });
      writeJSON(forgeDir, 'user-input.json', {
        requestId: 'q2',
        answer: 'PostgreSQL',
      });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });
  });

  describe('does not require mode-specific files for non-matching modes', () => {
    it('does not require presearch-state.json during build mode', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'build',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      writeJSON(forgeDir, 'build-state.json', { version: 1, phases: [] });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });

    it('does not require build-state.json during presearch mode', () => {
      writeJSON(forgeDir, 'state.json', {
        mode: 'presearch',
        status: 'running',
        updatedAt: '2026-01-01T00:00:00Z',
      });
      writeJSON(forgeDir, 'presearch-state.json', { version: 1, questions: [] });
      const errors = validateForgeState(forgeDir);
      expect(errors).toEqual([]);
    });
  });
});
