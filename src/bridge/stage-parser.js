const fs = require('fs');
const path = require('path');

class StageParser {
  constructor(bus, patternsPath) {
    this.bus = bus;
    this.lineBuffer = '';
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

  parseLine(line) {
    const stripped = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
    if (!stripped) return null;

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

  flush() {
    if (this.lineBuffer.trim()) {
      this.parseLine(this.lineBuffer);
      this.lineBuffer = '';
    }
  }
}

module.exports = { StageParser };
