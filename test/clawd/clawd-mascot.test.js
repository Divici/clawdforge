import { ClawdMascot, COSTUMES, EVENT_COSTUME_MAP } from '../../src/clawd/clawd-mascot';

test('COSTUMES has 14 entries', () => {
  expect(Object.keys(COSTUMES)).toHaveLength(14);
});

test('EVENT_COSTUME_MAP has 14 mappings', () => {
  expect(Object.keys(EVENT_COSTUME_MAP)).toHaveLength(14);
});

test('all EVENT_COSTUME_MAP values are valid costumes', () => {
  for (const costume of Object.values(EVENT_COSTUME_MAP)) {
    expect(COSTUMES[costume]).toBeTruthy();
  }
});

test('starts with idle costume', () => {
  const mascot = new ClawdMascot();
  expect(mascot.costume).toBe('idle');
});

test('setCostume changes costume', () => {
  const mascot = new ClawdMascot();
  mascot.setCostume('detective');
  expect(mascot.costume).toBe('detective');
});

test('setCostume ignores invalid costume', () => {
  const mascot = new ClawdMascot();
  mascot.setCostume('nonexistent');
  expect(mascot.costume).toBe('idle');
});

test('setCostume ignores same costume', () => {
  const mascot = new ClawdMascot();
  mascot.setCostume('idle');
  expect(mascot.costume).toBe('idle');
});

test('setCostumeFromEvent maps event to costume', () => {
  const mascot = new ClawdMascot();
  mascot.setCostumeFromEvent('presearch-constraints');
  expect(mascot.costume).toBe('detective');
});

test('setCostumeFromEvent ignores unknown event', () => {
  const mascot = new ClawdMascot();
  mascot.setCostumeFromEvent('unknown-event');
  expect(mascot.costume).toBe('idle');
});

test('update centers mascot horizontally', () => {
  const mascot = new ClawdMascot();
  mascot.update(800, 180);
  expect(mascot.x).toBe((800 - 96) / 2);
});

test('update positions mascot above ground line', () => {
  const mascot = new ClawdMascot();
  mascot.update(800, 180);
  expect(mascot.y).toBe(180 * 0.8 - 96);
});

test('draw calls ctx methods', () => {
  const mascot = new ClawdMascot();
  mascot.update(800, 180);
  const ctx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
  };
  mascot.draw(ctx);
  expect(ctx.fillRect).toHaveBeenCalled();
  expect(ctx.fillText).toHaveBeenCalled();
});
