// Orchestrator state machine + draw
// States: idle, dispatching, complete, error
// Sized to half the panel width, overflows top so only eyes and below are visible

import { drawSprite, loadSprite } from './sprites.js';

export class Orchestrator {
  constructor() {
    this.state = 'idle';
    this.img = null;
    this.x = 0;
    this.y = 0;
    this.size = 128;
    this.pulsePhase = 0;
    this.loadPromise = loadSprite('assets/sprites/orchestrator.png').then((img) => {
      this.img = img;
    }).catch(() => {
      this.img = null;
    });
  }

  setState(newState) {
    const valid = ['idle', 'dispatching', 'complete', 'error'];
    if (valid.includes(newState)) {
      this.state = newState;
    }
  }

  resize(width, height) {
    // Half the panel width
    this.size = Math.floor(width * 0.5);
    this.x = (width - this.size) / 2;
    // Position so the top ~35% overflows above the canvas (eyes at ~30% from top)
    this.y = -this.size * 0.20;
  }

  update() {
    this.pulsePhase += 0.05;
  }

  draw(ctx) {
    const pulse = Math.sin(this.pulsePhase) * 0.15;
    let alpha = 1;
    let tint = null;
    let bob = 0;

    switch (this.state) {
      case 'idle':
        alpha = 0.5;
        break;
      case 'dispatching':
        alpha = 0.85 + pulse;
        bob = Math.sin(this.pulsePhase * 0.8) * 3;
        break;
      case 'complete':
        alpha = 1;
        tint = 'rgba(74, 222, 128, 0.3)';
        break;
      case 'error':
        alpha = 0.9;
        tint = 'rgba(232, 85, 85, 0.4)';
        break;
    }

    if (this.img) {
      drawSprite(ctx, this.img, this.x, this.y, this.size, this.size, { alpha, tint, bob });
    } else {
      // Fallback rectangle
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.state === 'error' ? '#e85555' : '#5b9a5b';
      ctx.fillRect(this.x, this.y + bob, this.size, this.size);
      // Eye ports (proportional)
      const eyeSize = this.size * 0.06;
      const eyeY = this.y + bob + this.size * 0.25;
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(this.x + this.size * 0.25, eyeY, eyeSize, eyeSize);
      ctx.fillRect(this.x + this.size * 0.65, eyeY, eyeSize, eyeSize);
      ctx.restore();
    }

    // No label — the looming presence speaks for itself
  }

  get centerX() { return this.x + this.size / 2; }
  get bottomY() { return this.y + this.size; }
}
