// Spark particles at junction points between conduits and sprites

const PARTICLE_SIZE = 4;
const PARTICLES_PER_JUNCTION = 3;
const PARTICLE_RADIUS = 8;

export class ParticleSystem {
  constructor(orchestrator, forgeCore, subagentManager) {
    this.orchestrator = orchestrator;
    this.forgeCore = forgeCore;
    this.subagentManager = subagentManager;
    this.particles = [];
    this.active = false;
    this.frameCount = 0;
  }

  resize() {
    // Particles are regenerated each frame based on junction positions
  }

  update() {
    this.active = this.forgeCore.state === 'active';
    this.frameCount++;

    if (!this.active) {
      this.particles = [];
      return;
    }

    this._regenerateParticles();
  }

  _regenerateParticles() {
    this.particles = [];

    const junctions = this._getJunctions();
    for (const junction of junctions) {
      for (let i = 0; i < PARTICLES_PER_JUNCTION; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * PARTICLE_RADIUS;
        const phase = (this.frameCount * 0.15 + i * 2.1) % (Math.PI * 2);
        // 3-frame cycle: bright → dim → off
        const cyclePos = (Math.sin(phase) + 1) / 2;

        this.particles.push({
          x: junction.x + Math.cos(angle) * dist,
          y: junction.y + Math.sin(angle) * dist,
          alpha: cyclePos * 0.8,
        });
      }
    }
  }

  _getJunctions() {
    const junctions = [];

    // Orchestrator bottom (conduit exit)
    junctions.push({
      x: this.orchestrator.centerX,
      y: this.orchestrator.bottomY,
    });

    // Forge top (conduit entry)
    junctions.push({
      x: this.forgeCore.centerX,
      y: this.forgeCore.topY,
    });

    // Forge bottom (conduit exit to pods)
    junctions.push({
      x: this.forgeCore.centerX,
      y: this.forgeCore.bottomY,
    });

    // Pod tops (conduit entry)
    const pods = this.subagentManager.getPodPositions();
    for (const pod of pods) {
      if (pod.state !== 'empty') {
        junctions.push({ x: pod.x, y: pod.y });
      }
    }

    return junctions;
  }

  draw(ctx) {
    if (!this.active || this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      if (p.alpha < 0.1) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#e8956a';
      ctx.fillRect(
        p.x - PARTICLE_SIZE / 2,
        p.y - PARTICLE_SIZE / 2,
        PARTICLE_SIZE,
        PARTICLE_SIZE
      );
    }
    ctx.restore();
  }
}
