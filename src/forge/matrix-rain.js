// Matrix rain — falling green character columns

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
const CHAR_SIZE = 14;
const FADE_ALPHA = 0.04;
const RAIN_OPACITY = 0.15;

export class MatrixRain {
  constructor() {
    this.columns = [];
    this.width = 0;
    this.height = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    const colCount = Math.ceil(width / CHAR_SIZE);

    // Preserve existing columns, add new ones if needed
    while (this.columns.length < colCount) {
      this.columns.push({
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1.5,
        chars: [],
      });
    }
    this.columns.length = colCount;
  }

  update() {
    for (const col of this.columns) {
      col.y += col.speed;
      if (col.y > this.height + CHAR_SIZE) {
        col.y = -CHAR_SIZE;
        col.speed = 0.5 + Math.random() * 1.5;
      }
    }
  }

  draw(ctx) {
    // Fade previous frame
    ctx.fillStyle = `rgba(30, 30, 46, ${FADE_ALPHA})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = `${CHAR_SIZE}px monospace`;
    ctx.globalAlpha = RAIN_OPACITY;

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      const x = i * CHAR_SIZE;
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];

      // Bright head
      ctx.fillStyle = '#4ade80';
      ctx.globalAlpha = RAIN_OPACITY * 1.5;
      ctx.fillText(char, x, col.y);

      // Dimmer trail chars
      ctx.fillStyle = '#2d5a3d';
      ctx.globalAlpha = RAIN_OPACITY * 0.6;
      for (let j = 1; j < 6; j++) {
        const trailChar = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(trailChar, x, col.y - j * CHAR_SIZE);
      }
    }

    ctx.globalAlpha = 1;
  }
}
