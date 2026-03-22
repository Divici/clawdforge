const { parseExtractionOutput } = require('../src/bridge/output-extractor');

test('parses question with options', () => {
  const output = `[Q] What database should we use?
[O*] SQLite | ✓ Zero config | ✓ Embedded | ✗ No concurrent writes | Best when: local
[O] PostgreSQL | ✓ Mature | ✓ Complex queries | ✗ Needs server | Best when: production
[END]`;
  const events = parseExtractionOutput(output);
  expect(events.length).toBe(4); // question + 2 options + option-end
  expect(events[0].type).toBe('forge:question');
  expect(events[1].type).toBe('forge:option');
  expect(events[1].recommended).toBe(true);
  expect(events[2].recommended).toBe(false);
  expect(events[3].type).toBe('forge:option-end');
});

test('parses text question', () => {
  const output = `[TQ] What is your project name?`;
  const events = parseExtractionOutput(output);
  expect(events.length).toBe(1);
  expect(events[0].type).toBe('forge:text-question');
  expect(events[0].content).toBe('What is your project name?');
});

test('parses decision', () => {
  const output = `[D] Database: SQLite — embedded, zero config`;
  const events = parseExtractionOutput(output);
  expect(events.length).toBe(1);
  expect(events[0].type).toBe('forge:decision');
});

test('parses registry', () => {
  const output = `[R] [{"id":"R-001","text":"Shorten URL","priority":"Must-have"}]`;
  const events = parseExtractionOutput(output);
  expect(events.length).toBe(1);
  expect(events[0].type).toBe('forge:registry');
  expect(events[0].requirements[0].id).toBe('R-001');
});

test('returns empty for [NONE]', () => {
  const output = `[NONE]`;
  const events = parseExtractionOutput(output);
  expect(events.length).toBe(0);
});

test('handles multiple questions', () => {
  const output = `[Q] What database?
[O*] SQLite | ✓ Simple | ✗ Limited
[O] Postgres | ✓ Powerful | ✗ Complex
[END]
[Q] What framework?
[O*] Express | ✓ Popular | ✗ Minimal
[O] Fastify | ✓ Fast | ✗ Less ecosystem
[END]`;
  const events = parseExtractionOutput(output);
  const questions = events.filter(e => e.type === 'forge:question');
  expect(questions.length).toBe(2);
});

test('handles mixed questions and decisions', () => {
  const output = `[D] Platform: Web app
[Q] What CSS approach?
[O*] Tailwind | ✓ Utility classes | ✗ Verbose
[O] CSS Modules | ✓ Scoped | ✗ More files
[END]`;
  const events = parseExtractionOutput(output);
  expect(events[0].type).toBe('forge:decision');
  expect(events[1].type).toBe('forge:question');
});
