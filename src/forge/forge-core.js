// Forge core — canvas-drawn forge structure + state machine
// States: cold, active, cooling

const WIDTH = 128;
const HEIGHT = 96;
const GLOW_RADIUS = 48;

export class ForgeCore {
  constructor() {
    this.state = 'cold';
    this.x = 0;
    this.y = 0;
    this.pulsePhase = 0;
    this.coolingStart = 0;
    this.coolingDuration = 2000;
  }

  setState(newState) {
    const valid = ['cold', 'active', 'cooling'];
    if (valid.includes(newState)) {
      if (newState === 'cooling') {
        this.coolingStart = Date.now();
      }
      this.state = newState;
    }
  }

  resize(width, height) {
    this.x = (width - WIDTH) / 2;
    this.y = height * 0.42;
  }

  update() {
    this.pulsePhase += 0.04;

    if (this.state === 'cooling') {
      const elapsed = Date.now() - this.coolingStart;
      if (elapsed > this.coolingDuration) {
        this.state = 'cold';
      }
    }
  }

  draw(ctx) {
    const pulse = Math.sin(this.pulsePhase) * 0.2;
    let coreAlpha = 0.3;
    let glowColor = null;
    let glowAlpha = 0;

    switch (this.state) {
      case 'cold':
        coreAlpha = 0.3;
        break;
      case 'active':
        coreAlpha = 0.8 + pulse * 0.2;
        glowColor = '#e8956a';
        glowAlpha = 0.15 + pulse * 0.1;
        break;
      case 'cooling': {
        const elapsed = Date.now() - this.coolingStart;
        const progress = Math.min(elapsed / this.coolingDuration, 1);
        coreAlpha = 0.8 - progress * 0.5;
        glowColor = '#e8956a';
        glowAlpha = (0.15 - progress * 0.15);
        break;
      }
    }

    ctx.save();

    // Glow effect
    if (glowColor && glowAlpha > 0) {
      const gradient = ctx.createRadialGradient(
        this.x + WIDTH / 2, this.y + HEIGHT / 2, 4,
        this.x + WIDTH / 2, this.y + HEIGHT / 2, Math.max(WIDTH, HEIGHT) + GLOW_RADIUS
      );
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(
        this.x - GLOW_RADIUS, this.y - GLOW_RADIUS,
        WIDTH + GLOW_RADIUS * 2, HEIGHT + GLOW_RADIUS * 2
      );
    }

    ctx.globalAlpha = coreAlpha;

    // Forge body — wide anvil shape
    ctx.fillStyle = '#5b9a5b';
    // Base
    ctx.fillRect(this.x + 8, this.y + HEIGHT - 20, WIDTH - 16, 20);
    // Middle pillar
    ctx.fillRect(this.x + 24, this.y + 24, WIDTH - 48, HEIGHT - 48);
    // Top plate
    ctx.fillRect(this.x, this.y, WIDTH, 28);

    // Inner core (hot center)
    if (this.state === 'active' || this.state === 'cooling') {
      ctx.fillStyle = '#e8956a';
      ctx.globalAlpha = coreAlpha * 0.6;
      ctx.fillRect(this.x + 32, this.y + 28, WIDTH - 64, HEIGHT - 56);
    }

    // Outline
    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 2;
    ctx.globalAlpha = coreAlpha;
    ctx.strokeRect(this.x, this.y, WIDTH, 28);
    ctx.strokeRect(this.x + 24, this.y + 24, WIDTH - 48, HEIGHT - 48);
    ctx.strokeRect(this.x + 8, this.y + HEIGHT - 20, WIDTH - 16, 20);

    ctx.restore();

    // Label
    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#e8956a';
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.fillText('FORGE', this.x + WIDTH / 2, this.y - 10);
    ctx.restore();
  }

  get centerX() { return this.x + WIDTH / 2; }
  get topY() { return this.y; }
  get bottomY() { return this.y + HEIGHT; }
}
