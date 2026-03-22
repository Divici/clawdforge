import { HelperManager, MAX_VISIBLE } from '../../src/clawd/helpers';

test('MAX_VISIBLE is 6', () => {
  expect(MAX_VISIBLE).toBe(6);
});

test('spawn adds a helper', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  expect(mgr.helpers).toHaveLength(1);
});

test('spawn returns the helper object', () => {
  const mgr = new HelperManager();
  const helper = mgr.spawn();
  expect(helper).toBeTruthy();
  expect(helper.state).toBe('entering');
});

test('spawn returns null when at max', () => {
  const mgr = new HelperManager();
  for (let i = 0; i < MAX_VISIBLE; i++) mgr.spawn();
  expect(mgr.spawn()).toBeNull();
});

test('done marks first working helper as leaving', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  mgr.helpers[0].state = 'working';
  mgr.done();
  expect(mgr.helpers[0].state).toBe('leaving');
});

test('done does nothing when no working helpers', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  // helper is 'entering', not 'working'
  mgr.done();
  expect(mgr.helpers[0].state).toBe('entering');
});

test('getActiveCount excludes leaving helpers', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  mgr.spawn();
  mgr.helpers[0].state = 'working';
  mgr.helpers[1].state = 'leaving';
  expect(mgr.getActiveCount()).toBe(1);
});

test('getActiveCount includes entering helpers', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  expect(mgr.getActiveCount()).toBe(1);
});

test('update removes off-screen helpers', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  mgr.helpers[0].x = -100;
  mgr.helpers[0].state = 'leaving';
  mgr.update(800, 180, 352);
  expect(mgr.helpers).toHaveLength(0);
});

test('update moves entering helpers toward target', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  // Simulate a few update ticks
  for (let i = 0; i < 50; i++) {
    mgr.update(800, 180, 352);
  }
  // After many updates, helper should have reached target and be working
  expect(mgr.helpers[0].state).toBe('working');
});

test('draw calls ctx methods for each helper', () => {
  const mgr = new HelperManager();
  mgr.spawn();
  mgr.helpers[0].state = 'working';
  mgr.helpers[0].x = 400;
  mgr.helpers[0].y = 96;
  const ctx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
  };
  mgr.draw(ctx, 0);
  expect(ctx.fillRect).toHaveBeenCalled();
  expect(ctx.fillText).toHaveBeenCalled();
});

test('helpers have unique ids', () => {
  const mgr = new HelperManager();
  const h1 = mgr.spawn();
  const h2 = mgr.spawn();
  expect(h1.id).not.toBe(h2.id);
});
