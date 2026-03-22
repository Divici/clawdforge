import { ClawdMascot } from './clawd-mascot.js';
import { HelperManager } from './helpers.js';

let mascot = null;
let helperManager = null;
let animFrameId = null;
let frameCount = 0;
let lastFrameTime = 0;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function initStage(canvas) {
  destroyStage();
  mascot = new ClawdMascot();
  helperManager = new HelperManager();
  frameCount = 0;
  lastFrameTime = 0;

  resizeStage(canvas);
  startLoop(canvas);
}

export function resizeStage(canvas) {
  const parent = canvas.parentElement;
  if (parent) {
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }
}

export function destroyStage() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

export function setCostume(eventKey) {
  if (mascot) mascot.setCostumeFromEvent(eventKey);
}

export function spawnHelper() {
  if (helperManager) return helperManager.spawn();
  return null;
}

export function removeHelper() {
  if (helperManager) helperManager.done();
}

export function getHelperCount() {
  if (helperManager) return helperManager.getActiveCount();
  return 0;
}

function startLoop(canvas) {
  const ctx = canvas.getContext('2d');

  function render(timestamp) {
    animFrameId = requestAnimationFrame(render);

    // Throttle to 30fps
    if (timestamp - lastFrameTime < FRAME_INTERVAL) return;
    lastFrameTime = timestamp;
    frameCount++;

    const { width, height } = canvas;

    // Clear
    ctx.fillStyle = '#252540';
    ctx.fillRect(0, 0, width, height);

    // Ground line
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.8);
    ctx.lineTo(width, height * 0.8);
    ctx.stroke();

    // Update and draw mascot
    if (mascot) {
      mascot.update(width, height);
      mascot.draw(ctx);
    }

    // Update and draw helpers
    if (helperManager && mascot) {
      helperManager.update(width, height, mascot.x);
      helperManager.draw(ctx, frameCount);
    }
  }

  animFrameId = requestAnimationFrame(render);
}
