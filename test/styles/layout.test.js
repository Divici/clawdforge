import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const globalPath = resolve(__dirname, '../../src/styles/global.css');
const globalCSS = readFileSync(globalPath, 'utf-8');

describe('global.css', () => {
  it('imports theme.css', () => {
    expect(globalCSS).toMatch(/@import\s+['"]\.\/theme\.css['"]/);
  });

  it('.app-layout uses display: flex', () => {
    expect(globalCSS).toMatch(/\.app-layout\s*\{[^}]*display:\s*flex/s);
  });

  it('.app-layout uses flex-direction: column', () => {
    expect(globalCSS).toMatch(/\.app-layout\s*\{[^}]*flex-direction:\s*column/s);
  });

  it('.app-layout__dashboard uses flex: 1', () => {
    expect(globalCSS).toMatch(/\.app-layout__dashboard\s*\{[^}]*flex:\s*1/s);
  });

  it('.app-layout__stage uses height: 180px', () => {
    expect(globalCSS).toMatch(/\.app-layout__stage\s*\{[^}]*height:\s*180px/s);
  });

  it('sets body background from theme variable', () => {
    expect(globalCSS).toMatch(/background:\s*var\(--color-bg\)/);
  });

  it('sets body color from theme variable', () => {
    expect(globalCSS).toMatch(/color:\s*var\(--color-cream\)/);
  });
});
