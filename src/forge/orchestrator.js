// Orchestrator state machine + draw
// States: idle, dispatching, complete, error

import { drawSprite, loadSprite } from './sprites.js';

const SIZE = 64;

export class Orchestrator {
  constructor() {
    this.state = 'idle';
    this.img = null;
    this.x = 0;
    this.y = 0;
    this.pulsePhase = 0;
    this.loadPromise = loadSprite('assets/sprites/orchestrator.png').then((img) => {
      this.img = img;
    }).catch(() => {
      this.img = null; // Fallback to rectangle
    });
  }

  setState(newState) {
    const valid = ['idle', 'dispatching', 'complete', 'error'];
    if (valid.includes(newState)) {
      this.state = newState;
    }
  }

  resize(width, height) {
    this.x = (width - SIZE) / 2;
    this.y = height * 0.12;
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
        bob = Math.sin(this.pulsePhase * 0.8) * 2;
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
      drawSprite(ctx, this.img, this.x, this.y, SIZE, SIZE, { alpha, tint, bob });
    } else {
      // Fallback rectangle
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.state === 'error' ? '#e85555' : '#5b9a5b';
      ctx.fillRect(this.x, this.y + bob, SIZE, SIZE);
      // Eye ports
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(this.x + 16, this.y + bob + 12, 8, 8);
      ctx.fillRect(this.x + 40, this.y + bob + 12, 8, 8);
      ctx.restore();
    }

    // Label
    ctx.save();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#4ade80';
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.fillText('ORCHESTRATOR', this.x + SIZE / 2, this.y - 8);
    ctx.restore();
  }

  get centerX() { return this.x + SIZE / 2; }
  get bottomY() { return this.y + SIZE; }
}
