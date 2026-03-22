const { EventEmitter } = require('events');

const FORGE_EVENTS_V2 = [
  'forge:question', 'forge:option', 'forge:option-end',
  'forge:text-question', 'forge:accordion', 'forge:accordion-section',
  'forge:registry', 'forge:decision', 'forge:loop',
  'forge:mode', 'forge:phase', 'forge:task',
  'forge:blocker', 'forge:context-warning', 'forge:complete',
  'forge:agent-spawn', 'forge:agent-done',
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

module.exports = { ForgeBus, FORGE_EVENTS_V2 };
