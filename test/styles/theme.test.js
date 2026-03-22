import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const themePath = resolve(__dirname, '../../src/styles/theme.css');
const themeCSS = readFileSync(themePath, 'utf-8');

describe('theme.css', () => {
  const expectedColors = [
    '--color-bg',
    '--color-surface',
    '--color-surface-hover',
    '--color-primary',
    '--color-primary-dim',
    '--color-cream',
    '--color-tan',
    '--color-tan-dim',
    '--color-success',
    '--color-error',
    '--color-warning',
  ];

  it.each(expectedColors)('defines color custom property %s', (prop) => {
    expect(themeCSS).toContain(prop);
  });

  it('defines all 11 color custom properties', () => {
    for (const prop of expectedColors) {
      expect(themeCSS).toContain(prop);
    }
  });

  const expectedFonts = [
    '--font-pixel',
    '--font-mono',
    '--font-sans',
  ];

  it.each(expectedFonts)('defines font variable %s', (prop) => {
    expect(themeCSS).toContain(prop);
  });

  it('does not contain Matrix-green references', () => {
    // No "green" color word (case-insensitive check on common green values)
    expect(themeCSS).not.toMatch(/#4ade80/i);
    expect(themeCSS).not.toMatch(/#5b9a5b/i);
    expect(themeCSS).not.toMatch(/crt-overlay/i);
    // No generic "green" as a color value (but allow it in comments or property names like --color-success which is a green shade by hex)
    expect(themeCSS).not.toMatch(/:\s*green\b/i);
  });
});
