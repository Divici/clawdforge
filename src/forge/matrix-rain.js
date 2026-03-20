// Matrix rain — falling green character columns

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
const CHAR_SIZE = 10;
const RAIN_OPACITY = 0.18;
const TRAIL_LENGTH = 12;

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

    while (this.columns.length < colCount) {
      this.columns.push({
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1.5,
        chars: this._randomChars(TRAIL_LENGTH),
      });
    }
    this.columns.length = colCount;
  }

  _randomChars(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
    }
    return result;
  }

  update() {
    for (const col of this.columns) {
      col.y += col.speed;
      if (col.y > this.height + CHAR_SIZE * TRAIL_LENGTH) {
        col.y = -CHAR_SIZE;
        col.speed = 0.5 + Math.random() * 1.5;
        col.chars = this._randomChars(TRAIL_LENGTH);
      }
      // Occasionally change a trail character
      if (Math.random() < 0.05) {
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
      }
    }
  }

  draw(ctx) {
    ctx.font = `${CHAR_SIZE}px monospace`;

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      const x = i * CHAR_SIZE;

      // Draw trail (dimmer further from head)
      for (let j = 0; j < TRAIL_LENGTH; j++) {
        const charY = col.y - j * CHAR_SIZE;
        if (charY < -CHAR_SIZE || charY > this.height + CHAR_SIZE) continue;

        const fade = 1 - j / TRAIL_LENGTH;
        if (j === 0) {
          // Bright head
          ctx.fillStyle = '#4ade80';
          ctx.globalAlpha = RAIN_OPACITY * 1.8 * fade;
        } else {
          ctx.fillStyle = '#2d5a3d';
          ctx.globalAlpha = RAIN_OPACITY * fade * 0.7;
        }
        ctx.fillText(col.chars[j] || '0', x, charY);
      }
    }

    ctx.globalAlpha = 1;
  }
}
