const { spawn } = require('child_process');

const EXTRACTION_PROMPT = `Extract questions and options from this AI assistant output. Use EXACTLY this format:

For a multiple-choice question:
[Q] question text
[O*] recommended option | ✓ pro one | ✓ pro two | ✗ con one | Best when: context
[O] other option | ✓ pro one | ✓ pro two | ✗ con one | Best when: context
[END]

For a text-input question (no predefined choices):
[TQ] question text

For a locked decision:
[D] decision summary

For a requirements table:
[R] [{"id":"R-001","text":"description","priority":"Must-have"}]

If the text has NO questions, options, or decisions, output only: [NONE]

Every [O] and [O*] MUST include at least 2 pros (✓) and 1 con (✗).
Prefer multiple-choice [Q] over text-input [TQ] whenever possible.

Text to extract from:
---
`;

/**
 * Extract structured questions/options from Claude's raw output
 * using a fast claude -p call.
 *
 * @param {string} rawText - Claude's raw output text (ANSI stripped)
 * @param {string} cwd - Working directory for the claude command
 * @returns {Promise<Array>} Array of parsed events
 */
function extractFromOutput(rawText, cwd) {
  return new Promise((resolve) => {
    // Trim to last ~2000 chars to keep extraction fast
    const text = rawText.length > 2000 ? rawText.slice(-2000) : rawText;
    const fullPrompt = EXTRACTION_PROMPT + text;

    let output = '';
    let resolved = false;

    const proc = spawn('claude', ['-p', '--model', 'haiku', fullPrompt], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    });

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        resolve([]);
      }
    }, 10000); // 10s timeout

    proc.on('close', () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve(parseExtractionOutput(output));
      }
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        resolve([]);
      }
    });
  });
}

/**
 * Parse the extraction output into event objects.
 */
function parseExtractionOutput(output) {
  const events = [];
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.some(l => l === '[NONE]')) return events;

  let currentQuestion = null;
  let currentOptions = [];
  let questionCounter = Date.now(); // Unique IDs

  for (const line of lines) {
    // Question
    if (line.startsWith('[Q]')) {
      // Emit previous question if pending
      if (currentQuestion && currentOptions.length > 0) {
        events.push(...buildQuestionEvents(currentQuestion, currentOptions, questionCounter++));
      }
      currentQuestion = line.slice(3).trim();
      currentOptions = [];
      continue;
    }

    // Text question
    if (line.startsWith('[TQ]')) {
      // Emit previous question if pending
      if (currentQuestion && currentOptions.length > 0) {
        events.push(...buildQuestionEvents(currentQuestion, currentOptions, questionCounter++));
      }
      currentQuestion = null;
      currentOptions = [];
      events.push({
        type: 'forge:text-question',
        id: `q${questionCounter++}`,
        content: line.slice(4).trim(),
      });
      continue;
    }

    // Recommended option
    if (line.startsWith('[O*]')) {
      currentOptions.push({ text: line.slice(4).trim(), recommended: true });
      continue;
    }

    // Regular option
    if (line.startsWith('[O]')) {
      currentOptions.push({ text: line.slice(3).trim(), recommended: false });
      continue;
    }

    // End of options
    if (line === '[END]') {
      if (currentQuestion && currentOptions.length > 0) {
        events.push(...buildQuestionEvents(currentQuestion, currentOptions, questionCounter++));
      }
      currentQuestion = null;
      currentOptions = [];
      continue;
    }

    // Decision
    if (line.startsWith('[D]')) {
      events.push({
        type: 'forge:decision',
        content: line.slice(3).trim(),
      });
      continue;
    }

    // Registry
    if (line.startsWith('[R]')) {
      try {
        const json = line.slice(3).trim();
        const requirements = JSON.parse(json);
        events.push({
          type: 'forge:registry',
          requirements,
          content: '',
        });
      } catch {
        // Invalid JSON, skip
      }
      continue;
    }
  }

  // Emit any remaining pending question
  if (currentQuestion && currentOptions.length > 0) {
    events.push(...buildQuestionEvents(currentQuestion, currentOptions, questionCounter));
  }

  return events;
}

/**
 * Build forge events for a question + its options.
 */
function buildQuestionEvents(question, options, id) {
  const qId = `q${id}`;
  const events = [];

  events.push({ type: 'forge:question', id: qId, content: question });

  for (const opt of options) {
    events.push({
      type: 'forge:option',
      id: qId,
      recommended: opt.recommended,
      content: opt.text,
    });
  }

  events.push({ type: 'forge:option-end', id: qId, content: '' });

  return events;
}

module.exports = { extractFromOutput, parseExtractionOutput };
