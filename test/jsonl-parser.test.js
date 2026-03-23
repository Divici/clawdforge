const { JsonlParser } = require('../src/bridge/jsonl-parser');

describe('JsonlParser', () => {
  it('parses a complete single-line JSON object', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.feed('{"type":"system","session_id":"abc"}\n');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ type: 'system', session_id: 'abc' });
  });

  it('buffers partial lines across chunks', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.feed('{"type":');
    expect(results).toHaveLength(0);
    parser.feed('"assistant"}\n');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('assistant');
  });

  it('handles multiple lines in one chunk', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.feed('{"a":1}\n{"b":2}\n{"c":3}\n');
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ a: 1 });
    expect(results[1]).toEqual({ b: 2 });
    expect(results[2]).toEqual({ c: 3 });
  });

  it('skips empty lines', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.feed('{"a":1}\n\n\n{"b":2}\n');
    expect(results).toHaveLength(2);
  });

  it('calls onError for invalid JSON and continues', () => {
    const results = [];
    const errors = [];
    const parser = new JsonlParser(
      (obj) => results.push(obj),
      (err, line) => errors.push({ err, line }),
    );
    parser.feed('not-json\n{"valid":true}\n');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ valid: true });
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe('not-json');
  });

  it('silently skips invalid JSON when no onError provided', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    expect(() => parser.feed('bad\n{"ok":1}\n')).not.toThrow();
    expect(results).toHaveLength(1);
  });

  it('flush emits buffered partial line', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.feed('{"final":true}');
    expect(results).toHaveLength(0);
    parser.flush();
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ final: true });
  });

  it('flush is a no-op when buffer is empty', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.flush();
    expect(results).toHaveLength(0);
  });

  it('handles carriage return line endings', () => {
    const results = [];
    const parser = new JsonlParser((obj) => results.push(obj));
    parser.feed('{"a":1}\r\n{"b":2}\r\n');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ a: 1 });
  });
});
