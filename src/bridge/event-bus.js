const { EventEmitter } = require('events');

class ForgeBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  emit(event, payload) {
    return super.emit(event, payload);
  }
}

module.exports = { ForgeBus };
