// Canvas render loop — 30fps throttled via requestAnimationFrame

const TARGET_FPS = 30;
const FRAME_TIME = 1000 / TARGET_FPS;

export class ForgeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layers = [];
    this.lastFrameTime = 0;
    this.running = false;
  }

  addLayer(layer) {
    this.layers.push(layer);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const layer of this.layers) {
      if (layer.resize) {
        layer.resize(rect.width, rect.height);
      }
    }
  }

  start() {
    this.running = true;
    this.resize();
    this._tick(0);
  }

  stop() {
    this.running = false;
  }

  _tick(timestamp) {
    if (!this.running) return;

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed >= FRAME_TIME) {
      this.lastFrameTime = timestamp - (elapsed % FRAME_TIME);
      this._render();
    }

    requestAnimationFrame((t) => this._tick(t));
  }

  _render() {
    for (const layer of this.layers) {
      if (layer.update) layer.update();
      if (layer.draw) layer.draw(this.ctx);
    }
  }
}
