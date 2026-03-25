const fs = require('fs');
const path = require('path');

/**
 * Read and parse a JSON file, returning null on failure.
 */
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Validate .forge/ state files.
 * Returns an array of error strings. Empty array = valid.
 *
 * @param {string} forgeDir - Path to the .forge/ directory
 * @returns {string[]} Array of validation errors
 */
function validateForgeState(forgeDir) {
  const errors = [];

  // state.json must exist and be valid JSON
  const state = readJSON(path.join(forgeDir, 'state.json'));
  if (!state) {
    errors.push('MISSING: .forge/state.json — write this file before completing your turn');
    return errors; // fatal — can't validate further
  }

  // Required fields
  if (!state.mode) errors.push('INVALID: state.json missing "mode" field');
  if (!state.status) errors.push('INVALID: state.json missing "status" field');
  if (!state.updatedAt) errors.push('INVALID: state.json missing "updatedAt" field');

  if (errors.length > 0) return errors; // can't validate mode-specific files without valid base

  // Mode-specific validation
  if (state.mode === 'presearch') {
    const ps = readJSON(path.join(forgeDir, 'presearch-state.json'));
    if (!ps) {
      errors.push('MISSING: .forge/presearch-state.json — required during presearch mode');
    } else if (!Array.isArray(ps.questions)) {
      errors.push('INVALID: presearch-state.json missing "questions" array');
    }
  }

  if (state.mode === 'build') {
    const bs = readJSON(path.join(forgeDir, 'build-state.json'));
    if (!bs) {
      errors.push('MISSING: .forge/build-state.json — required during build mode');
    } else if (!Array.isArray(bs.phases)) {
      errors.push('INVALID: build-state.json missing "phases" array');
    }
  }

  // Interactive mode: when waiting for user input, let the turn complete.
  // The dashboard will resume Claude after the user answers.
  // Do NOT block with exit 2 here — that creates a busy-wait loop that burns turns.

  return errors;
}

/**
 * Generate the gate-check.js script content that will be installed
 * in the target project's .forge/ directory.
 */
function generateGateCheckScript() {
  return `#!/usr/bin/env node
// Gate-check Stop hook — validates .forge/ state files
// Installed by Claw'd Forge. Exit 2 = block the turn.
const fs = require('fs');
const path = require('path');

function readJSON(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch { return null; }
}

const forgeDir = path.join(process.cwd(), '.forge');
const errors = [];

const state = readJSON(path.join(forgeDir, 'state.json'));
if (!state) {
  console.error('=== FORGE GATE CHECK FAILED ===');
  console.error('  - MISSING: .forge/state.json — write this file before completing your turn');
  process.exit(2);
}

if (!state.mode) errors.push('INVALID: state.json missing "mode" field');
if (!state.status) errors.push('INVALID: state.json missing "status" field');
if (!state.updatedAt) errors.push('INVALID: state.json missing "updatedAt" field');

if (errors.length === 0 && state.mode === 'presearch') {
  const ps = readJSON(path.join(forgeDir, 'presearch-state.json'));
  if (!ps) errors.push('MISSING: .forge/presearch-state.json — required during presearch mode');
  else if (!Array.isArray(ps.questions)) errors.push('INVALID: presearch-state.json missing "questions" array');
}

if (errors.length === 0 && state.mode === 'build') {
  const bs = readJSON(path.join(forgeDir, 'build-state.json'));
  if (!bs) errors.push('MISSING: .forge/build-state.json — required during build mode');
  else if (!Array.isArray(bs.phases)) errors.push('INVALID: build-state.json missing "phases" array');
}

// Interactive mode: let the turn complete when waiting for input.
// The dashboard will resume Claude after the user answers.

if (errors.length > 0) {
  console.error('=== FORGE GATE CHECK FAILED ===');
  errors.forEach(e => console.error('  - ' + e));
  console.error('Fix these issues and write the required .forge/ files before completing your turn.');
  process.exit(2);
}

process.exit(0);
`;
}

module.exports = { validateForgeState, generateGateCheckScript };
