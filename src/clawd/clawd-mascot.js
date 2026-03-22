export const COSTUMES = {
  idle:       { label: 'Idle',       color: '#E07A4B' },
  detective:  { label: 'Detective',  color: '#D4A574' },
  architect:  { label: 'Architect',  color: '#8B7355' },
  scientist:  { label: 'Scientist',  color: '#5BAE6B' },
  planner:    { label: 'Planner',    color: '#E8B84B' },
  critic:     { label: 'Critic',     color: '#E85555' },
  builder:    { label: 'Builder',    color: '#B85E3A' },
  coach:      { label: 'Coach',      color: '#D4A574' },
  foreman:    { label: 'Foreman',    color: '#E07A4B' },
  inspector:  { label: 'Inspector',  color: '#8B7355' },
  rocket:     { label: 'Rocket',     color: '#E8B84B' },
  party:      { label: 'Party',      color: '#5BAE6B' },
  error:      { label: 'Error',      color: '#E85555' },
  coffee:     { label: 'Coffee',     color: '#D4A574' },
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
    const costume = COSTUMES[this.costume];
    const bobOffset = Math.sin(this.frameCount * 0.05) * 3;

    ctx.fillStyle = costume.color;
    ctx.fillRect(this.x, this.y + bobOffset, this.width, this.height);

    ctx.fillStyle = '#1A1A2E';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(costume.label, this.x + this.width / 2, this.y + bobOffset + this.height / 2);
  }
}
