const { translateAction } = require('../src/bridge/stdin-translator');

test('select-option translates to natural language', () => {
  expect(translateAction('select-option', { name: 'SQLite' }))
    .toBe("I'll go with SQLite");
});

test('select-recommended includes option name', () => {
  expect(translateAction('select-recommended', { name: 'SQLite' }))
    .toBe("I'll go with the recommended option: SQLite");
});

test('custom-text passes through exact text', () => {
  expect(translateAction('custom-text', { text: 'Use Redis instead' }))
    .toBe('Use Redis instead');
});

test('confirm-registry returns standard phrase', () => {
  expect(translateAction('confirm-registry', {}))
    .toBe("The requirements registry looks good, let's proceed");
});

test('submit-key includes the key', () => {
  expect(translateAction('submit-key', { key: 'sk-abc123' }))
    .toBe("Here's the API key: sk-abc123");
});

test('skip-mock returns standard phrase', () => {
  expect(translateAction('skip-mock', {}))
    .toBe("Let's skip this and use a mock for now");
});

test('pause returns standard phrase', () => {
  expect(translateAction('pause', {}))
    .toBe('Please pause after the current task completes');
});

test('resume with instructions prepends them', () => {
  expect(translateAction('resume', { instructions: 'Switch auth to Clerk' }))
    .toBe('Switch auth to Clerk. Resume building.');
});

test('resume without instructions just resumes', () => {
  expect(translateAction('resume', {}))
    .toBe('Resume building.');
});

test('unknown action with text fallback', () => {
  expect(translateAction('something-new', { text: 'fallback text' }))
    .toBe('fallback text');
});

test('unknown action without text returns empty string', () => {
  expect(translateAction('something-new', {}))
    .toBe('');
});

test('custom-text with empty text returns empty string', () => {
  expect(translateAction('custom-text', {}))
    .toBe('');
});
