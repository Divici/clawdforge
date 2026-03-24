const fs = require('fs');
const path = require('path');

class ForgeStateWatcher {
  constructor(bus, forgeDir, interval = 500) {
    this.bus = bus;
    this.forgeDir = forgeDir;
    this.interval = interval;
    this._timer = null;
    this._lastState = null;
    this._lastPresearch = null;
    this._lastBuild = null;
    this._lastConfig = null;
    this._lastStateStat = null;
    this._lastPresearchStat = null;
    this._lastBuildStat = null;
    this._lastConfigStat = null;
  }

  start() {
    this._poll(); // immediate first check
    this._timer = setInterval(() => this._poll(), this.interval);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _poll() {
    this._pollFile('state.json', '_lastStateStat', '_lastState', '_onStateChange');
    this._pollFile('presearch-state.json', '_lastPresearchStat', '_lastPresearch', '_onPresearchChange');
    this._pollFile('build-state.json', '_lastBuildStat', '_lastBuild', '_onBuildChange');
    this._pollFile('config-required.json', '_lastConfigStat', '_lastConfig', '_onConfigChange');
  }

  _pollFile(filename, statKey, cacheKey, handlerName) {
    const filePath = path.join(this.forgeDir, filename);

    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return; // file doesn't exist yet
    }

    const fingerprint = `${stat.mtimeMs}:${stat.size}`;
    if (this[statKey] === fingerprint) return; // unchanged
    this[statKey] = fingerprint;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      // Reset fingerprint so we retry on next poll
      this[statKey] = null;
      return; // partial write or invalid JSON
    }

    const prev = this[cacheKey];
    this[cacheKey] = data;
    this[handlerName](prev, data);
  }

  _onStateChange(prev, next) {
    // Only emit granular diff events when we have a previous state to compare against.
    // The first read emits forge:state-update but not diff events.
    if (prev) {
      if (prev.mode !== next.mode) {
        this.bus.emit('forge:mode-change', { mode: next.mode });
      }
      if (prev.status !== next.status) {
        this.bus.emit('forge:status-change', { status: next.status });
      }
      if (prev.presearch?.currentLoop !== next.presearch?.currentLoop) {
        this.bus.emit('forge:loop-change', {
          loop: next.presearch.currentLoop,
          name: next.presearch.currentLoopName,
        });
      }
      if (!prev.presearch?.waitingForInput && next.presearch?.waitingForInput) {
        this.bus.emit('forge:waiting-for-input', {
          requestId: next.presearch.inputRequestId,
        });
      }
      if (prev.build?.currentPhase !== next.build?.currentPhase && next.build?.currentPhase) {
        this.bus.emit('forge:phase-change', {
          phase: next.build.currentPhase,
          completedPhases: next.build.completedPhases,
        });
      }
    }
    this.bus.emit('forge:state-update', next);
  }

  _onPresearchChange(_prev, next) {
    this.bus.emit('forge:presearch-update', next);
  }

  _onBuildChange(_prev, next) {
    this.bus.emit('forge:build-update', next);
  }

  _onConfigChange(_prev, next) {
    this.bus.emit('forge:config-update', next);
  }
}

module.exports = { ForgeStateWatcher };
