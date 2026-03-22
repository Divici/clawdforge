import {
  initStage,
  resizeStage,
  destroyStage,
  setCostume,
  spawnHelper,
  removeHelper,
  getHelperCount,
} from '../../src/clawd/stage-renderer';

let rafCallback = null;

beforeEach(() => {
  rafCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
    rafCallback = cb;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  destroyStage();
  vi.restoreAllMocks();
});

function createMockCanvas() {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    parentElement: { clientWidth: 800, clientHeight: 180 },
  };
  return { canvas, ctx };
}

function tickFrame(ctx, timestamp = 100) {
  // Reset mocks so we can check fresh calls
  Object.values(ctx).forEach(v => { if (typeof v?.mockClear === 'function') v.mockClear(); });
  if (rafCallback) rafCallback(timestamp);
}

test('initStage gets 2d context', () => {
  const { canvas } = createMockCanvas();
  initStage(canvas);
  expect(canvas.getContext).toHaveBeenCalledWith('2d');
});

test('initStage starts requestAnimationFrame loop', () => {
  const { canvas } = createMockCanvas();
  initStage(canvas);
  expect(requestAnimationFrame).toHaveBeenCalled();
});

test('render frame draws background and ground line', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  tickFrame(ctx, 100);
  expect(ctx.fillRect).toHaveBeenCalled();
  expect(ctx.beginPath).toHaveBeenCalled();
  expect(ctx.moveTo).toHaveBeenCalled();
  expect(ctx.lineTo).toHaveBeenCalled();
  expect(ctx.stroke).toHaveBeenCalled();
});

test('render frame draws mascot label', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  tickFrame(ctx, 100);
  expect(ctx.fillText).toHaveBeenCalledWith('Idle', expect.any(Number), expect.any(Number));
});

test('resizeStage sets canvas dimensions from parent', () => {
  const { canvas } = createMockCanvas();
  resizeStage(canvas);
  expect(canvas.width).toBe(800);
  expect(canvas.height).toBe(180);
});

test('setCostume changes mascot costume', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  setCostume('presearch-constraints');
  tickFrame(ctx, 100);
  expect(ctx.fillText).toHaveBeenCalledWith('Detective', expect.any(Number), expect.any(Number));
});

test('spawnHelper and getHelperCount work', () => {
  const { canvas } = createMockCanvas();
  initStage(canvas);
  expect(getHelperCount()).toBe(0);
  spawnHelper();
  expect(getHelperCount()).toBe(1);
});

test('removeHelper transitions a helper out', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  spawnHelper();
  // Move helper to working state by ticking many frames
  for (let t = 100; t < 6000; t += 100) {
    tickFrame(ctx, t);
  }
  removeHelper();
  expect(getHelperCount()).toBe(0);
});

test('destroyStage cancels animation frame', () => {
  const { canvas } = createMockCanvas();
  initStage(canvas);
  destroyStage();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
