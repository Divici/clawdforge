const fs = require('fs');
const path = require('path');

class StageParser {
  constructor(bus, patternsPath) {
    this.bus = bus;
    this.lineBuffer = '';
    this.structuredMode = false;
    this.patterns = this._loadPatterns(patternsPath);

    // Natural language parser state
    this._nlState = {
      recentLines: [],      // Rolling window of recent cleaned lines
      questionId: 0,        // Auto-incrementing question ID
      pendingQuestion: null, // Question text waiting for options
      pendingOptions: [],   // Options collected for current question
      collectingOptions: false,
      lastEmittedQuestion: '', // Avoid duplicate emissions
    };
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
   * Natural language parsing — detects questions, options, decisions
   * from Claude's freeform presearch output.
   */
  _parseNaturalLanguage(stripped) {
    const nl = this._nlState;

    // Keep a rolling window of recent lines for context
    nl.recentLines.push(stripped);
    if (nl.recentLines.length > 30) nl.recentLines.shift();

    // Detect table rows (requirements registry)
    if (this._detectRegistryRow(stripped)) return;

    // Detect numbered options: "1." "2." "3." or "- Option"
    const numberedMatch = stripped.match(/^(\d+)\.\s+\*?\*?(.+?)\*?\*?\s*$/);
    const bulletMatch = !numberedMatch && stripped.match(/^[-•]\s+\*?\*?(.+?)\*?\*?\s*$/);

    if (numberedMatch || bulletMatch) {
      const optionText = numberedMatch ? numberedMatch[2].trim() : bulletMatch[1].trim();

      if (nl.collectingOptions) {
        // Add to current option list
        const option = this._parseOptionText(optionText, nl.pendingOptions.length === 0);
        nl.pendingOptions.push(option);
        return;
      }

      // If we have a pending question, start collecting
      if (nl.pendingQuestion) {
        nl.collectingOptions = true;
        const option = this._parseOptionText(optionText, true);
        nl.pendingOptions.push(option);
        return;
      }
    }

    // If we were collecting options and hit a non-option line, emit what we have
    if (nl.collectingOptions && !numberedMatch && !bulletMatch) {
      // Some non-option lines are sub-details — skip short lines or lines starting with spaces
      if (stripped.length < 3 || /^\s{2,}/.test(stripped)) return;

      this._emitCollectedQuestion();
    }

    // Detect questions: lines ending with ?
    if (stripped.endsWith('?') && stripped.length > 15 && stripped.length < 300) {
      // Skip if it's a sub-question or rhetorical
      if (stripped.startsWith('-') || stripped.startsWith('*')) return;

      // Emit any previous pending question first
      if (nl.pendingQuestion && nl.pendingOptions.length > 0) {
        this._emitCollectedQuestion();
      }

      // Avoid duplicate questions
      if (stripped === nl.lastEmittedQuestion) return;

      nl.pendingQuestion = stripped;
      nl.pendingOptions = [];
      nl.collectingOptions = false;
      return;
    }

    // Detect decisions / locked choices
    const decisionMatch = stripped.match(
      /^(?:(?:Decision|Selected|Chosen|Going with|Locked|Using)[:\s]+)(.+)/i
    );
    if (decisionMatch) {
      this.bus.emit('forge:decision', { content: decisionMatch[1].trim() });
      return;
    }

    // Detect loop/phase keywords
    const loopMatch = stripped.match(
      /^(?:Loop|Phase|Step)\s+(\d+)[:\s]+(\w[\w\s]*)/i
    );
    if (loopMatch) {
      const loopNum = parseInt(loopMatch[1], 10);
      const loopName = loopMatch[2].trim();
      this.bus.emit('forge:loop', { loop: loopNum, name: loopName, content: stripped });
      return;
    }

    // Detect "Constraints" / "Discovery" / etc. as section headers
    const sectionMatch = stripped.match(
      /^(?:#{1,3}\s+)?(?:Loop\s+\d+[:\s]+)?(Constraints|Discovery|Refinement|Plan(?:ning)?|Gap\s*Analysis|Validation)\b/i
    );
    if (sectionMatch) {
      const nameMap = {
        'constraints': { loop: 1, name: 'Constraints' },
        'discovery': { loop: 2, name: 'Discovery' },
        'refinement': { loop: 3, name: 'Refinement' },
        'planning': { loop: 4, name: 'Plan' },
        'plan': { loop: 4, name: 'Plan' },
        'gap analysis': { loop: 5, name: 'Gap Analysis' },
        'gapanalysis': { loop: 5, name: 'Gap Analysis' },
        'validation': { loop: 5, name: 'Gap Analysis' },
      };
      const key = sectionMatch[1].toLowerCase().replace(/\s+/g, '');
      const mapping = nameMap[key] || nameMap[sectionMatch[1].toLowerCase()];
      if (mapping) {
        this.bus.emit('forge:loop', { loop: mapping.loop, name: mapping.name, content: stripped });
      }
    }
  }

  /**
   * Parse a single option text into { name, description, pros, cons, recommended }
   */
  _parseOptionText(text, isFirst) {
    // Check for "Recommended" or "★" markers
    const recommended = isFirst || /recommended|★|\*\*/i.test(text);

    // Try to split on " — " or " - " for name vs description
    let name = text;
    let description = '';

    const dashSplit = text.match(/^(.+?)\s+[—–-]\s+(.+)$/);
    if (dashSplit) {
      name = dashSplit[1].replace(/\*\*/g, '').trim();
      description = dashSplit[2].trim();
    } else {
      // Remove markdown bold
      name = text.replace(/\*\*/g, '').trim();
    }

    // Extract pros/cons from description if present
    const pros = [];
    const cons = [];

    if (description) {
      // Check for inline pros/cons: "✓ fast, ✗ complex"
      const proParts = description.match(/[✓✔+]\s*([^,;✗✘\-]+)/g);
      const conParts = description.match(/[✗✘]\s*([^,;✓✔+]+)/g);

      if (proParts) {
        for (const p of proParts) {
          const t = p.replace(/^[✓✔+]\s*/, '').trim();
          if (t) pros.push(t);
        }
      }
      if (conParts) {
        for (const c of conParts) {
          const t = c.replace(/^[✗✘]\s*/, '').trim();
          if (t) cons.push(t);
        }
      }

      // If no pros/cons markers found, use the description as a pro
      if (pros.length === 0 && cons.length === 0 && description) {
        pros.push(description);
      }
    }

    return { name, description, pros, cons, bestWhen: '', recommended };
  }

  /**
   * Detect requirements registry table rows
   */
  _detectRegistryRow(stripped) {
    // Match table rows like: │ R-001 │ Description │ Category │ Priority │
    const tableRowMatch = stripped.match(
      /[│|]\s*(R-\d{3})\s*[│|]\s*(.+?)\s*[│|]\s*(.+?)\s*[│|]\s*(.+?)\s*[│|]/
    );
    if (tableRowMatch) {
      if (!this._nlState._registryRows) {
        this._nlState._registryRows = [];
      }
      this._nlState._registryRows.push({
        id: tableRowMatch[1],
        text: tableRowMatch[2].trim(),
        category: tableRowMatch[3].trim(),
        priority: tableRowMatch[4].trim(),
      });

      // Debounce: emit registry after 200ms of no new rows
      clearTimeout(this._nlState._registryTimer);
      this._nlState._registryTimer = setTimeout(() => {
        if (this._nlState._registryRows && this._nlState._registryRows.length > 0) {
          this.bus.emit('forge:registry', {
            requirements: [...this._nlState._registryRows],
            content: '',
          });
          this._nlState._registryRows = [];
        }
      }, 200);

      return true;
    }
    return false;
  }

  /**
   * Emit the collected question + options
   */
  _emitCollectedQuestion() {
    const nl = this._nlState;
    if (!nl.pendingQuestion || nl.pendingOptions.length === 0) {
      nl.collectingOptions = false;
      return;
    }

    nl.questionId++;
    const qId = `q${nl.questionId}`;

    // Emit question
    this.bus.emit('forge:question', {
      id: qId,
      content: nl.pendingQuestion,
    });

    // Emit each option
    for (const opt of nl.pendingOptions) {
      this.bus.emit('forge:option', {
        id: qId,
        recommended: opt.recommended,
        content: this._formatOptionContent(opt),
      });
    }

    // Emit option end
    this.bus.emit('forge:option-end', { id: qId, content: '' });

    nl.lastEmittedQuestion = nl.pendingQuestion;
    nl.pendingQuestion = null;
    nl.pendingOptions = [];
    nl.collectingOptions = false;
  }

  /**
   * Format an option back into the pipe-separated format the wizard expects
   */
  _formatOptionContent(opt) {
    const parts = [opt.name];
    for (const p of opt.pros) parts.push(`✓ ${p}`);
    for (const c of opt.cons) parts.push(`✗ ${c}`);
    if (opt.bestWhen) parts.push(`Best when: ${opt.bestWhen}`);
    return parts.join(' | ');
  }

  parseLine(line) {
    const stripped = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\][^\x07]*\x07/g, '')       // OSC sequences
      .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')   // DEC private modes
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // control chars
      .trim();
    if (!stripped) return null;

    // Try structured markers first (v2) — if skill files emit them
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

    // Natural language parsing (Approach C fallback)
    if (!this.structuredMode) {
      this._parseNaturalLanguage(stripped);
    }

    return null;
  }

  flush() {
    // Emit any pending question before flushing
    if (this._nlState.pendingQuestion && this._nlState.pendingOptions.length > 0) {
      this._emitCollectedQuestion();
    }
    if (this.lineBuffer.trim()) {
      this.parseLine(this.lineBuffer);
      this.lineBuffer = '';
    }
  }
}

module.exports = { StageParser };
