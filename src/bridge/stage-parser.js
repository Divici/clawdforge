const fs = require('fs');
const path = require('path');

class StageParser {
  constructor(bus, patternsPath) {
    this.bus = bus;
    this.lineBuffer = '';
    this.structuredMode = false;
    this.patterns = this._loadPatterns(patternsPath);
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
    // Keep the last incomplete line in the buffer
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

    // Map marker type to event name
    const event = 'forge:' + markerType.toLowerCase().replace(/_/g, '-');

    // Parse key-value pairs
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

    // Special case: REGISTRY
    if (markerType === 'REGISTRY') {
      try {
        payload.requirements = JSON.parse(content);
      } catch {
        payload.parseError = true;
        payload.rawContent = content;
      }
    }

    // Special case: COMPLETE
    if (markerType === 'COMPLETE') {
      try {
        payload.summary = JSON.parse(content);
      } catch {
        // leave content as-is
      }
    }

    return { event, payload };
  }

  parseLine(line) {
    const stripped = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
    if (!stripped) return null;

    // Try structured markers first (v2)
    const forgeResult = this.parseForgeMarker(stripped);
    if (forgeResult) {
      this.structuredMode = true;
      this.bus.emit(forgeResult.event, forgeResult.payload);
      return forgeResult;
    }

    // Fall through to v1 regex patterns
    for (const pattern of this.patterns) {
      const match = stripped.match(pattern.regex);
      if (match) {
        // Find first non-undefined capture group (handles alternations)
        const value =
          match.slice(1).find((g) => g !== undefined) || stripped;
        const payload = { [pattern.payloadKey]: value, raw: stripped };
        this.bus.emit(pattern.event, payload);
        return { event: pattern.event, payload };
      }
    }
    return null;
  }

  /**
   * Feed clean text from stream-json assistant content blocks.
   * Unlike feed(), this does not buffer across calls — each text
   * block is self-contained.
   */
  feedText(text) {
    if (!text) return;
    const lines = text.split('\n');
    for (const line of lines) {
      this.parseLine(line);
    }
  }

  flush() {
    if (this.lineBuffer.trim()) {
      this.parseLine(this.lineBuffer);
      this.lineBuffer = '';
    }
  }
}

module.exports = { StageParser };
