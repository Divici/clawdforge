/**
 * Initialize the Claw'd stage canvas.
 * @param {HTMLCanvasElement} canvas
 */
export function initStage(canvas) {
  const ctx = canvas.getContext('2d');
  resizeStage(canvas);
  drawStage(ctx, canvas.width, canvas.height);
}

/**
 * Resize canvas to fill its container.
 * @param {HTMLCanvasElement} canvas
 */
export function resizeStage(canvas) {
  const parent = canvas.parentElement;
  if (parent) {
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }
}

/**
 * Draw the placeholder stage.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function drawStage(ctx, width, height) {
  // Background
  ctx.fillStyle = '#252540'; // --color-surface
  ctx.fillRect(0, 0, width, height);

  // Ground line at 80% height
  ctx.strokeStyle = '#8B7355'; // --color-tan-dim
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.8);
  ctx.lineTo(width, height * 0.8);
  ctx.stroke();

  // Centered placeholder text
  ctx.fillStyle = '#F5E6D3'; // --color-cream
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Claw'd Stage", width / 2, height * 0.4);
}
