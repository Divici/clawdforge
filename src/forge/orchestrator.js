// Orchestrator state machine + draw
// States: idle, dispatching, complete, error
// Sized to half the panel width, overflows top so only eyes and below are visible
// Uses 8-frame sprite sheet for animation

import { drawSprite, loadSprite } from './sprites.js';

const TOTAL_FRAMES = 8;
const ANIM_SPEED_IDLE = 0.08;       // Slow cycle when idle
const ANIM_SPEED_ACTIVE = 0.2;      // Faster when dispatching

export class Orchestrator {
  constructor() {
    this.state = 'idle';
    this.sheetImg = null;
    this.staticImg = null;
    this.x = 0;
    this.y = 0;
    this.size = 128;
    this.pulsePhase = 0;
    this.frameAccum = 0;
    this.currentFrame = 0;

    // Load sprite sheet (preferred) and static fallback
    this.loadPromise = loadSprite('assets/sprites/orchestrator-sheet.png').then((img) => {
      this.sheetImg = img;
    }).catch(() => {
      // Fall back to static sprite
      return loadSprite('assets/sprites/orchestrator.png').then((img) => {
        this.staticImg = img;
      }).catch(() => {});
    });
  }

  setState(newState) {
    const valid = ['idle', 'dispatching', 'complete', 'error'];
    if (valid.includes(newState)) {
      this.state = newState;
    }
  }

  resize(width, height) {
    this.size = Math.floor(width * 0.4);
    this.x = (width - this.size) / 2;
    this.y = -this.size * 0.20;
  }

  update() {
    this.pulsePhase += 0.05;

    // Advance animation frame
    const speed = this.state === 'dispatching' ? ANIM_SPEED_ACTIVE : ANIM_SPEED_IDLE;
    this.frameAccum += speed;
    if (this.frameAccum >= 1) {
      this.frameAccum -= 1;
      this.currentFrame = (this.currentFrame + 1) % TOTAL_FRAMES;
    }
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

    if (this.sheetImg) {
      drawSprite(ctx, this.sheetImg, this.x, this.y, this.size, this.size, {
        alpha, tint, bob,
        frame: this.currentFrame,
        totalFrames: TOTAL_FRAMES,
      });
    } else if (this.staticImg) {
      drawSprite(ctx, this.staticImg, this.x, this.y, this.size, this.size, { alpha, tint, bob });
    } else {
      // Fallback rectangle
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.state === 'error' ? '#e85555' : '#5b9a5b';
      ctx.fillRect(this.x, this.y + bob, this.size, this.size);
      const eyeSize = this.size * 0.06;
      const eyeY = this.y + bob + this.size * 0.25;
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(this.x + this.size * 0.25, eyeY, eyeSize, eyeSize);
      ctx.fillRect(this.x + this.size * 0.65, eyeY, eyeSize, eyeSize);
      ctx.restore();
    }
  }

  get centerX() { return this.x + this.size / 2; }
  get bottomY() { return this.y + this.size; }
}
