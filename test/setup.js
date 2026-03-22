// Mock canvas getContext for jsdom (which doesn't support it natively)
HTMLCanvasElement.prototype.getContext = function () {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect() {},
    fillText() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    clearRect() {},
    arc() {},
    closePath() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    drawImage() {},
    measureText() { return { width: 0 }; },
  };
};
