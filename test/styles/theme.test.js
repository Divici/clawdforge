import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const themePath = resolve(__dirname, '../../src/styles/theme.css');
const themeCSS = readFileSync(themePath, 'utf-8');

describe('theme.css — Stitch design system', () => {
  const expectedColors = [
    '--color-bg',
    '--color-surface-lowest',
    '--color-surface-low',
    '--color-surface',
    '--color-surface-high',
    '--color-surface-highest',
    '--color-primary',
    '--color-primary-container',
    '--color-on-surface',
    '--color-on-surface-variant',
    '--color-outline-variant',
    '--color-tertiary',
    '--color-error',
    '--color-warning',
  ];

  it.each(expectedColors)('defines color custom property %s', (prop) => {
    expect(themeCSS).toContain(prop);
  });

  const expectedFonts = [
    '--font-heading',
    '--font-body',
    '--font-mono',
  ];

  it.each(expectedFonts)('defines font variable %s', (prop) => {
    expect(themeCSS).toContain(prop);
  });

  it('uses Stitch base color #131313', () => {
    expect(themeCSS).toContain('#131313');
  });

  it('uses Stitch primary-container #D97757', () => {
    expect(themeCSS).toContain('#D97757');
  });

  it('includes Space Grotesk font-face', () => {
    expect(themeCSS).toContain('Space Grotesk');
  });

  it('includes Inter font-face', () => {
    expect(themeCSS).toContain('Inter');
  });

  it('does not contain old Matrix-green references', () => {
    expect(themeCSS).not.toMatch(/#4ade80/i);
    expect(themeCSS).not.toMatch(/crt-overlay/i);
  });
});
