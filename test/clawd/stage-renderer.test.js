import { initStage, resizeStage } from '../../src/clawd/stage-renderer';

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

test('initStage gets 2d context', () => {
  const { canvas } = createMockCanvas();
  initStage(canvas);
  expect(canvas.getContext).toHaveBeenCalledWith('2d');
});

test('initStage calls fillRect for background', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  expect(ctx.fillRect).toHaveBeenCalled();
});

test('initStage calls fillText with stage label', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  expect(ctx.fillText).toHaveBeenCalledWith("Claw'd Stage", expect.any(Number), expect.any(Number));
});

test('initStage draws ground line', () => {
  const { canvas, ctx } = createMockCanvas();
  initStage(canvas);
  expect(ctx.beginPath).toHaveBeenCalled();
  expect(ctx.moveTo).toHaveBeenCalled();
  expect(ctx.lineTo).toHaveBeenCalled();
  expect(ctx.stroke).toHaveBeenCalled();
});

test('resizeStage sets canvas dimensions from parent', () => {
  const { canvas } = createMockCanvas();
  resizeStage(canvas);
  expect(canvas.width).toBe(800);
  expect(canvas.height).toBe(180);
});
