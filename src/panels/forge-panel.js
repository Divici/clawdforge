import { ForgeRenderer } from '../forge/renderer.js';
import { MatrixRain } from '../forge/matrix-rain.js';
import { GridLines } from '../forge/grid-lines.js';

const canvas = document.getElementById('forge-canvas');
let renderer = null;

function initForge() {
  renderer = new ForgeRenderer(canvas);

  // Add layers bottom to top
  const matrixRain = new MatrixRain();
  const gridLines = new GridLines();

  renderer.addLayer(matrixRain);
  renderer.addLayer(gridLines);

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

// Initialize when app becomes visible
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', () => {
  // Small delay to ensure layout is settled after overlay hides
  setTimeout(initForge, 100);
});

export { renderer };
