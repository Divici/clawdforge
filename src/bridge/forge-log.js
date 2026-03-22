const fs = require('fs');
const path = require('path');

const DEFAULT_LOG = {
  projectName: '',
  startTime: null,
  mode: 'launch',
  presearchDecisions: [],
  buildCards: [],
  currentPhase: null,
  totalPhases: 0,
  phaseNames: [],
};

class ForgeLog {
  constructor(projectDir) {
    this.logPath = path.join(projectDir, 'forge-log.json');
    this._data = null;
  }

  load() {
    try {
      const raw = fs.readFileSync(this.logPath, 'utf-8');
      this._data = JSON.parse(raw);
      return this._data;
    } catch {
      this._data = {
        ...DEFAULT_LOG,
        presearchDecisions: [],
        buildCards: [],
        phaseNames: [],
      };
      return this._data;
    }
  }

  save(data) {
    this._data = data || this._data;
    try {
      fs.writeFileSync(this.logPath, JSON.stringify(this._data, null, 2), 'utf-8');
    } catch (err) {
      console.error('ForgeLog save failed:', err.message);
    }
  }

  addPresearchDecision(decision) {
    if (!this._data) this.load();
    this._data.presearchDecisions.push(decision);
    this.save();
  }

  addBuildCard(card) {
    if (!this._data) this.load();
    this._data.buildCards.push(card);
    this.save();
  }

  updatePhase(phase, current, total, names) {
    if (!this._data) this.load();
    this._data.currentPhase = phase;
    if (current !== undefined) this._data.currentPhase = phase;
    if (total !== undefined) this._data.totalPhases = total;
    if (names !== undefined) this._data.phaseNames = names;
    this.save();
  }

  updateMode(mode) {
    if (!this._data) this.load();
    this._data.mode = mode;
    this.save();
  }

  getLogPath() {
    return this.logPath;
  }
}

module.exports = { ForgeLog, DEFAULT_LOG };
