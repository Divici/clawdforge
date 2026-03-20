// Energy conduits — connecting lines with traveling highlights
// Orchestrator → Forge → Subagent pods

const LINE_COLOR = '#2d5a3d';
const HIGHLIGHT_COLOR = '#4ade80';
const LINE_WIDTH = 2;
const HIGHLIGHT_SIZE = 6;
const HIGHLIGHT_SPEED = 2;

export class EnergyLines {
  constructor(orchestrator, forgeCore, subagentManager) {
    this.orchestrator = orchestrator;
    this.forgeCore = forgeCore;
    this.subagentManager = subagentManager;
    this.highlightOffset = 0;
    this.active = false;
  }

  resize() {
    // No-op — positions come from sprites
  }

  update() {
    this.active = this.forgeCore.state === 'active';
    if (this.active) {
      this.highlightOffset += HIGHLIGHT_SPEED;
    }
  }

  draw(ctx) {
    if (!this.orchestrator || !this.forgeCore) return;

    const orchCx = this.orchestrator.centerX;
    const orchBy = this.orchestrator.bottomY;
    const forgeCx = this.forgeCore.centerX;
    const forgeTy = this.forgeCore.topY;
    const forgeBy = this.forgeCore.bottomY;

    ctx.save();

    // Line: Orchestrator → Forge
    this._drawConduit(ctx, orchCx, orchBy, forgeCx, forgeTy);

    // Lines: Forge → each pod
    const podPositions = this.subagentManager.getPodPositions();
    for (const pod of podPositions) {
      if (pod.state !== 'empty') {
        this._drawConduit(ctx, forgeCx, forgeBy, pod.x, pod.y);
      }
    }

    ctx.restore();
  }

  _drawConduit(ctx, x1, y1, x2, y2) {
    // Draw the base line
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw traveling highlight if active
    if (this.active) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;

      // Normalize
      const nx = dx / length;
      const ny = dy / length;

      // Position along line (wrapping)
      const t = (this.highlightOffset % length) / length;
      const hx = x1 + dx * t;
      const hy = y1 + dy * t;

      // Draw bright highlight dot
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = HIGHLIGHT_COLOR;
      ctx.beginPath();
      ctx.arc(hx, hy, HIGHLIGHT_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Subtle glow around highlight
      const gradient = ctx.createRadialGradient(hx, hy, 0, hx, hy, HIGHLIGHT_SIZE * 2);
      gradient.addColorStop(0, 'rgba(74, 222, 128, 0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = gradient;
      ctx.fillRect(hx - HIGHLIGHT_SIZE * 2, hy - HIGHLIGHT_SIZE * 2, HIGHLIGHT_SIZE * 4, HIGHLIGHT_SIZE * 4);
    }
  }
}
