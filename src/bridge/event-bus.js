const { EventEmitter } = require('events');

const FORGE_EVENTS_V2 = [
  'forge:question', 'forge:option', 'forge:option-end',
  'forge:text-question', 'forge:accordion', 'forge:accordion-section',
  'forge:registry', 'forge:decision', 'forge:loop',
  'forge:mode', 'forge:phase', 'forge:task',
  'forge:blocker', 'forge:context-warning', 'forge:complete',
  'forge:agent-spawn', 'forge:agent-done',
];

// Events emitted from stream-json Claude CLI output
const CLAUDE_EVENTS = [
  'claude:session',      // session_id + tools from init
  'claude:text',         // assistant text content
  'claude:tool-use',     // tool invocation (Read, Edit, Bash, etc.)
  'claude:tool-result',  // tool result
  'claude:cost',         // cost/duration from result event
  'claude:turn-end',     // turn completed
  'claude:error',        // stderr output
  'claude:exit',         // process exited
];

class ForgeBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emit(event, payload) {
    return super.emit(event, payload);
  }
}

module.exports = { ForgeBus, FORGE_EVENTS_V2, CLAUDE_EVENTS };
