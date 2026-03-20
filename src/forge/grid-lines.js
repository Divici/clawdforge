// Subtle grid lines — pixel grid pattern at low opacity

const GRID_SIZE = 32;
const GRID_OPACITY = 0.05;

export class GridLines {
  constructor() {
    this.width = 0;
    this.height = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  draw(ctx) {
    ctx.strokeStyle = '#4ade80';
    ctx.globalAlpha = GRID_OPACITY;
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
  }
}
