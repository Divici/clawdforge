const { ClaudeRunner } = require('../src/bridge/claude-runner');

// Test the extractable parts without spawning a real PTY
test('_buildEnv includes FORGE_ENABLED', () => {
  const runner = new ClaudeRunner({ emit: () => {} });
  const env = runner._buildEnv();
  expect(env.FORGE_ENABLED).toBe('true');
});

test('_buildEnv includes FORCE_COLOR', () => {
  const runner = new ClaudeRunner({ emit: () => {} });
  const env = runner._buildEnv();
  expect(env.FORCE_COLOR).toBe('1');
});

test('_buildEnv preserves process.env', () => {
  const runner = new ClaudeRunner({ emit: () => {} });
  const env = runner._buildEnv();
  expect(env.PATH).toBe(process.env.PATH);
});

test('write does not throw when ptyProcess is null', () => {
  const runner = new ClaudeRunner({ emit: () => {} });
  expect(() => runner.write('hello')).not.toThrow();
});

test('kill does not throw when ptyProcess is null', () => {
  const runner = new ClaudeRunner({ emit: () => {} });
  expect(() => runner.kill()).not.toThrow();
});
