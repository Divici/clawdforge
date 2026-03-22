/**
 * Translate a user dashboard action into natural language text
 * to send to Claude's PTY stdin.
 *
 * @param {string} action - The action type
 * @param {object} payload - Action-specific data
 * @returns {string} Text to write to PTY stdin
 */
function translateAction(action, payload = {}) {
  switch (action) {
    case 'select-option':
      return `I'll go with ${payload.name}`;
    case 'select-recommended':
      return `I'll go with the recommended option: ${payload.name}`;
    case 'custom-text':
      return payload.text || '';
    case 'confirm-registry':
      return "The requirements registry looks good, let's proceed";
    case 'submit-key':
      return `Here's the API key: ${payload.key}`;
    case 'skip-mock':
      return "Let's skip this and use a mock for now";
    case 'pause':
      return 'Please pause after the current task completes';
    case 'resume':
      return payload.instructions
        ? `${payload.instructions}. Resume building.`
        : 'Resume building.';
    default:
      return payload.text || '';
  }
}

module.exports = { translateAction };
