// Sprite loader and draw helpers

const spriteCache = new Map();

export function loadSprite(src) {
  if (spriteCache.has(src)) return spriteCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
    img.src = src;
  });

  spriteCache.set(src, promise);
  return promise;
}

export function drawSprite(ctx, img, x, y, width, height, options = {}) {
  const { alpha = 1, tint = null, bob = 0 } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering

  const drawY = y + bob;

  if (tint) {
    // Draw sprite to offscreen canvas, apply tint
    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    offCtx.drawImage(img, 0, 0, width, height);
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.fillStyle = tint;
    offCtx.fillRect(0, 0, width, height);
    ctx.drawImage(offscreen, x, drawY, width, height);
  } else {
    ctx.drawImage(img, x, drawY, width, height);
  }

  ctx.restore();
}
