import { ForgeRenderer } from '../forge/renderer.js';
import { MatrixRain } from '../forge/matrix-rain.js';
import { GridLines } from '../forge/grid-lines.js';
import { Orchestrator } from '../forge/orchestrator.js';
import { ForgeCore } from '../forge/forge-core.js';
import { SubagentManager } from '../forge/subagent.js';
import { EnergyLines } from '../forge/energy-lines.js';
import { ParticleSystem } from '../forge/particles.js';

const canvas = document.getElementById('forge-canvas');
let renderer = null;
let orchestrator = null;
let forgeCore = null;
let subagentManager = null;

function initForge() {
  renderer = new ForgeRenderer(canvas);
  orchestrator = new Orchestrator();
  forgeCore = new ForgeCore();
  subagentManager = new SubagentManager();

  const energyLines = new EnergyLines(orchestrator, forgeCore, subagentManager);
  const particles = new ParticleSystem(orchestrator, forgeCore, subagentManager);

  // Add layers bottom to top
  renderer.addLayer(new MatrixRain());
  renderer.addLayer(new GridLines());
  renderer.addLayer(energyLines);
  renderer.addLayer(forgeCore);
  renderer.addLayer(orchestrator);
  renderer.addLayer(subagentManager);
  renderer.addLayer(particles);

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    if (renderer) renderer.resize();
  });
  resizeObserver.observe(canvas.parentElement);

  // Wait for fonts then start
  document.fonts.ready.then(() => {
    renderer.start();
  });
}

// Handle forge events from stage parser
function handleForgeEvent(data) {
  if (!orchestrator) return;

  switch (data.type) {
    case 'mode:change':
      // First mode change activates the forge
      if (forgeCore.state === 'cold') {
        forgeCore.setState('active');
        orchestrator.setState('dispatching');
      }
      break;

    case 'stage:change':
      // Keep forge active on stage changes
      if (forgeCore.state === 'cold') {
        forgeCore.setState('active');
        orchestrator.setState('dispatching');
      }
      break;

    case 'agent:spawn':
      orchestrator.setState('dispatching');
      subagentManager.spawnPod();
      break;

    case 'agent:done':
      subagentManager.completePod();
      break;

    case 'warning':
      // Flash the forge orange briefly
      break;
  }
}

// Initialize when app becomes visible
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', () => {
  setTimeout(initForge, 100);
});

// Listen for forge events
window.forgeAPI.onForgeEvent(handleForgeEvent);

// Handle Claude exit
window.forgeAPI.onClaudeExit((data) => {
  if (!orchestrator) return;

  if (data.code === 0) {
    orchestrator.setState('complete');
    forgeCore.setState('cooling');
    subagentManager.setAllDone();
  } else {
    orchestrator.setState('error');
    forgeCore.setState('cooling');
    subagentManager.setAllError();
  }
});

export { renderer, orchestrator, forgeCore, subagentManager };
