/**
 * Streaming JSONL (JSON Lines) parser.
 * Buffers partial lines from a readable stream and emits parsed objects.
 */
class JsonlParser {
  constructor(onLine, onError) {
    this._onLine = onLine;
    this._onError = onError || null;
    this._buffer = '';
  }

  feed(chunk) {
    this._buffer += chunk;
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || '';

    for (const raw of lines) {
      const line = raw.replace(/\r$/, '');
      if (!line) continue;
      try {
        this._onLine(JSON.parse(line));
      } catch (err) {
        if (this._onError) this._onError(err, line);
      }
    }
  }

  flush() {
    const line = this._buffer.replace(/\r$/, '').trim();
    this._buffer = '';
    if (!line) return;
    try {
      this._onLine(JSON.parse(line));
    } catch (err) {
      if (this._onError) this._onError(err, line);
    }
  }
}

module.exports = { JsonlParser };
