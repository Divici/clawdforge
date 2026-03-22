export const MAX_VISIBLE = 6;

export class HelperManager {
  constructor() {
    this.helpers = [];
    this.nextId = 0;
  }

  spawn() {
    if (this.helpers.length >= MAX_VISIBLE) return null;
    const helper = {
      id: this.nextId++,
      x: 0,
      targetX: 0,
      y: 0,
      width: 48,
      height: 48,
      state: 'entering',
      bobOffset: Math.random() * Math.PI * 2,
    };
    this.helpers.push(helper);
    return helper;
  }

  done() {
    const idx = this.helpers.findIndex(h => h.state === 'working');
    if (idx >= 0) {
      this.helpers[idx].state = 'leaving';
    }
  }

  getActiveCount() {
    return this.helpers.filter(h => h.state !== 'leaving').length;
  }

  update(canvasWidth, canvasHeight, mascotX) {
    const groundY = canvasHeight * 0.8;
    const spacing = 56;

    this.helpers.forEach((h, i) => {
      h.targetX = mascotX + 120 + i * spacing;
      h.y = groundY - h.height;

      if (h.state === 'entering') {
        if (h.x === 0) h.x = canvasWidth + 50;
        h.x += (h.targetX - h.x) * 0.1;
        if (Math.abs(h.x - h.targetX) < 2) {
          h.x = h.targetX;
          h.state = 'working';
        }
      } else if (h.state === 'leaving') {
        h.x -= 3;
      }
    });

    this.helpers = this.helpers.filter(h => h.x > -60);
  }

  draw(ctx, frameCount) {
    for (const h of this.helpers) {
      const bob = Math.sin(frameCount * 0.08 + h.bobOffset) * 2;

      ctx.fillStyle = h.state === 'leaving' ? '#55433D' : '#D97757';
      ctx.globalAlpha = h.state === 'leaving' ? 0.4 : 0.7;
      ctx.fillRect(h.x, h.y + bob, h.width, h.height);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#E5E2E1';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('agent', h.x + h.width / 2, h.y + bob + h.height / 2);
    }
  }
}
