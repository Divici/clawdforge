export const COSTUMES = {
  idle:       { label: 'Idle',       color: '#D97757' },
  detective:  { label: 'Detective',  color: '#DBC1B9' },
  architect:  { label: 'Architect',  color: '#55433D' },
  scientist:  { label: 'Scientist',  color: '#5EDAC7' },
  planner:    { label: 'Planner',    color: '#E8B84B' },
  critic:     { label: 'Critic',     color: '#FFB4AB' },
  builder:    { label: 'Builder',    color: '#D97757' },
  coach:      { label: 'Coach',      color: '#DBC1B9' },
  foreman:    { label: 'Foreman',    color: '#D97757' },
  inspector:  { label: 'Inspector',  color: '#55433D' },
  rocket:     { label: 'Rocket',     color: '#E8B84B' },
  party:      { label: 'Party',      color: '#5EDAC7' },
  error:      { label: 'Error',      color: '#FFB4AB' },
  coffee:     { label: 'Coffee',     color: '#DBC1B9' },
};

export const EVENT_COSTUME_MAP = {
  'idle': 'idle',
  'presearch-constraints': 'detective',
  'presearch-discovery': 'architect',
  'presearch-refinement': 'scientist',
  'presearch-planning': 'planner',
  'presearch-gap': 'critic',
  'build-bootstrap': 'builder',
  'build-planning': 'coach',
  'build-executing': 'foreman',
  'build-review': 'inspector',
  'deploy': 'rocket',
  'complete': 'party',
  'error': 'error',
  'paused': 'coffee',
};

// Load clawSprite.png as the mascot image
let spriteImage = null;
let spriteLoaded = false;

export function loadSprite() {
  if (spriteImage) return;
  spriteImage = new Image();
  spriteImage.onload = () => { spriteLoaded = true; };
  spriteImage.onerror = () => { spriteLoaded = false; };
  // Vite resolves this import path at build time
  spriteImage.src = new URL('../assets/sprites/clawSprite.png', import.meta.url).href;
}

export class ClawdMascot {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 96;
    this.height = 96;
    this.costume = 'idle';
    this.frame = 0;
    this.frameCount = 0;
    this.opacity = 1;
    this.transitioning = false;
    loadSprite();
  }

  setCostume(costumeName) {
    if (!COSTUMES[costumeName] || costumeName === this.costume) return;
    this.costume = costumeName;
    this.frame = 0;
  }

  setCostumeFromEvent(eventKey) {
    const costume = EVENT_COSTUME_MAP[eventKey];
    if (costume) this.setCostume(costume);
  }

  update(canvasWidth, canvasHeight) {
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight * 0.8 - this.height;

    this.frameCount++;
    this.frame = Math.floor(this.frameCount / 15) % 4;
  }

  draw(ctx) {
    const bobOffset = Math.sin(this.frameCount * 0.05) * 3;

    if (spriteLoaded && spriteImage) {
      // Draw the sprite image
      ctx.drawImage(
        spriteImage,
        this.x, this.y + bobOffset,
        this.width, this.height
      );
    } else {
      // Fallback: colored rectangle with label (until sprite loads)
      const costume = COSTUMES[this.costume];
      ctx.fillStyle = costume.color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(this.x, this.y + bobOffset, this.width, this.height);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#E5E2E1';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(costume.label, this.x + this.width / 2, this.y + bobOffset + this.height / 2);
    }
  }
}
