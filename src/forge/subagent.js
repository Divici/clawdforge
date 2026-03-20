// Subagent pod state machine + draw
// States per pod: empty, spawning, working, done, error

import { drawSprite, loadSprite } from './sprites.js';

const POD_SIZE = 64;
const MAX_DISPLAY = 6;
const POD_GAP = 20;

export class SubagentManager {
  constructor() {
    this.pods = [];
    this.img = null;
    this.totalAgents = 0;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.pulsePhase = 0;
    this.loadPromise = loadSprite('assets/sprites/subagent.png').then((img) => {
      this.img = img;
    }).catch(() => {
      this.img = null;
    });
  }

  spawnPod() {
    this.totalAgents++;
    if (this.pods.length < MAX_DISPLAY) {
      this.pods.push({
        state: 'spawning',
        spawnStart: Date.now(),
        alpha: 0,
      });
    }
    this._recalcPositions();
  }

  completePod() {
    // Find first working pod and mark done
    const pod = this.pods.find((p) => p.state === 'working');
    if (pod) {
      pod.state = 'done';
    }
  }

  errorPod() {
    const pod = this.pods.find((p) => p.state === 'working');
    if (pod) {
      pod.state = 'error';
    }
  }

  setAllDone() {
    for (const pod of this.pods) {
      pod.state = 'done';
    }
  }

  setAllError() {
    for (const pod of this.pods) {
      if (pod.state === 'working' || pod.state === 'spawning') {
        pod.state = 'error';
      }
    }
  }

  resize(width, height) {
    this.width = width;
    this.y = height * 0.75;
    this._recalcPositions();
  }

  _recalcPositions() {
    const totalWidth = this.pods.length * POD_SIZE + (this.pods.length - 1) * POD_GAP;
    this.x = (this.width - totalWidth) / 2;
  }

  update() {
    this.pulsePhase += 0.06;

    for (const pod of this.pods) {
      if (pod.state === 'spawning') {
        const elapsed = Date.now() - pod.spawnStart;
        pod.alpha = Math.min(elapsed / 500, 1);
        if (pod.alpha >= 1) {
          pod.state = 'working';
        }
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.pods.length; i++) {
      const pod = this.pods[i];
      const px = this.x + i * (POD_SIZE + POD_GAP);
      const py = this.y;
      const pulse = Math.sin(this.pulsePhase + i * 0.5) * 0.1;

      let alpha = 1;
      let tint = null;
      let bob = 0;

      switch (pod.state) {
        case 'spawning':
          alpha = pod.alpha;
          break;
        case 'working':
          alpha = 0.8 + pulse;
          bob = Math.sin(this.pulsePhase + i * 0.3) * 1.5;
          break;
        case 'done':
          alpha = 1;
          tint = 'rgba(74, 222, 128, 0.2)';
          break;
        case 'error':
          alpha = 0.8;
          tint = 'rgba(232, 85, 85, 0.4)';
          break;
      }

      if (this.img) {
        drawSprite(ctx, this.img, px, py, POD_SIZE, POD_SIZE, { alpha, tint, bob });
      } else {
        // Fallback
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pod.state === 'error' ? '#e85555' : '#5b9a5b';
        ctx.fillRect(px, py + bob, POD_SIZE, POD_SIZE);
        ctx.fillStyle = '#d4d4d4';
        ctx.fillRect(px + 8, py + bob + 8, 6, 6);
        ctx.fillRect(px + 18, py + bob + 8, 6, 6);
        ctx.restore();
      }

      // Checkmark for done
      if (pod.state === 'done') {
        ctx.save();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(px + 10, py + POD_SIZE + 6);
        ctx.lineTo(px + 16, py + POD_SIZE + 12);
        ctx.lineTo(px + 24, py + POD_SIZE + 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Count badge if more agents than displayed
    if (this.totalAgents > MAX_DISPLAY) {
      ctx.save();
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8956a';
      ctx.globalAlpha = 0.8;
      ctx.textAlign = 'center';
      const badgeX = this.x + this.pods.length * (POD_SIZE + POD_GAP) + 20;
      ctx.fillText(`+${this.totalAgents - MAX_DISPLAY}`, badgeX, this.y + POD_SIZE / 2 + 4);
      ctx.restore();
    }

    // Label
    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#4ade80';
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.fillText('SUBAGENT PODS', this.width / 2, this.y - 12);
    ctx.restore();
  }

  getPodPositions() {
    return this.pods.map((pod, i) => ({
      x: this.x + i * (POD_SIZE + POD_GAP) + POD_SIZE / 2,
      y: this.y,
      state: pod.state,
    }));
  }
}
