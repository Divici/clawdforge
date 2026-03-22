const fs = require('fs');
const path = require('path');
const { extractFromOutput } = require('./output-extractor');

class StageParser {
  constructor(bus, patternsPath) {
    this.bus = bus;
    this.lineBuffer = '';
    this.structuredMode = false;
    this.patterns = this._loadPatterns(patternsPath);

    // Turn accumulation for extraction
    this._turnBuffer = '';
    this._turnDebounce = null;
    this._extracting = false;
    this._projectDir = null;
  }

  setProjectDir(dir) {
    this._projectDir = dir;
  }

  _loadPatterns(patternsPath) {
    const filePath = patternsPath || path.join(__dirname, 'patterns.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { patterns } = JSON.parse(raw);
    return patterns.map((p) => ({
      event: p.event,
      regex: new RegExp(p.regex, p.flags || ''),
      payloadKey: p.payloadKey,
      captureGroup: p.captureGroup || 0,
    }));
  }

  feed(chunk) {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() || '';

    for (const line of lines) {
      this.parseLine(line);
    }
  }

  parseForgeMarker(stripped) {
    const markerRegex = /^\[FORGE:(\w+)((?:\s+\w+=\S+)*)\]\s*(.*)/;
    const match = stripped.match(markerRegex);
    if (!match) return null;

    const markerType = match[1];
    const attributesString = match[2];
    const content = match[3];

    const event = 'forge:' + markerType.toLowerCase().replace(/_/g, '-');

    const payload = { content };
    if (attributesString.trim()) {
      const tokens = attributesString.trim().split(/\s+/);
      for (const token of tokens) {
        const eqIndex = token.indexOf('=');
        if (eqIndex !== -1) {
          const key = token.slice(0, eqIndex);
          let value = token.slice(eqIndex + 1);
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (/^\d+$/.test(value)) value = Number(value);
          payload[key] = value;
        }
      }
    }

    if (markerType === 'REGISTRY') {
      try {
        payload.requirements = JSON.parse(content);
      } catch {
        payload.parseError = true;
        payload.rawContent = content;
      }
    }

    if (markerType === 'COMPLETE') {
      try {
        payload.summary = JSON.parse(content);
      } catch {
        // leave content as-is
      }
    }

    return { event, payload };
  }

  /**
   * Accumulate cleaned text for turn-based extraction.
   * Debounces: triggers extraction 3 seconds after last output.
   */
  _accumulateForExtraction(stripped) {
    this._turnBuffer += stripped + '\n';

    // Reset debounce timer
    clearTimeout(this._turnDebounce);
    this._turnDebounce = setTimeout(() => {
      this._triggerExtraction();
    }, 3000);
  }

  /**
   * Trigger Haiku extraction on accumulated turn output.
   */
  async _triggerExtraction() {
    if (this._extracting || !this._turnBuffer.trim()) return;

    const text = this._turnBuffer;
    this._turnBuffer = '';
    this._extracting = true;

    try {
      const events = await extractFromOutput(text, this._projectDir || '.');

      for (const event of events) {
        this.bus.emit(event.type, event);
      }
    } catch (err) {
      console.error('Extraction failed:', err.message);
    } finally {
      this._extracting = false;
    }
  }

  parseLine(line) {
    const stripped = line
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\][^\x07]*\x07/g, '')
      .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      .trim();
    if (!stripped) return null;

    // Skip noise lines (spinners, progress bars, single chars)
    if (stripped.length <= 2) return null;
    if (/^[✻✶✢✽·*●⠂⠐⏵⏸⎿]+$/.test(stripped)) return null;

    // Try structured markers first (v2)
    const forgeResult = this.parseForgeMarker(stripped);
    if (forgeResult) {
      this.structuredMode = true;
      this.bus.emit(forgeResult.event, forgeResult.payload);
      return forgeResult;
    }

    // Try v1 regex patterns
    for (const pattern of this.patterns) {
      const match = stripped.match(pattern.regex);
      if (match) {
        const value =
          match.slice(1).find((g) => g !== undefined) || stripped;
        const payload = { [pattern.payloadKey]: value, raw: stripped };
        this.bus.emit(pattern.event, payload);
        return { event: pattern.event, payload };
      }
    }

    // If no structured markers detected, accumulate for extraction
    if (!this.structuredMode) {
      this._accumulateForExtraction(stripped);
    }

    return null;
  }

  flush() {
    if (this.lineBuffer.trim()) {
      this.parseLine(this.lineBuffer);
      this.lineBuffer = '';
    }
    // Trigger any pending extraction
    clearTimeout(this._turnDebounce);
    this._triggerExtraction();
  }
}

module.exports = { StageParser };
