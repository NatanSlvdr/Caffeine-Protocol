import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const matrix = readFileSync('docs/PLAYTEST.md', 'utf8');
const config = readFileSync('playwright.config.ts', 'utf8');

describe('the release playtest matrix', () => {
  it('names every browser the end-to-end tests run in, at the size they run at', () => {
    const projects = [...config.matchAll(/name:\s*'([\w-]+)'/g)].map(([, name]) => name);
    expect(projects).toEqual(expect.arrayContaining(['chromium', 'firefox', 'webkit']));
    expect(projects.filter((name) => !matrix.includes(`\`${name}\``))).toEqual([]);
    const sizes = new Set([...config.matchAll(/width:\s*(\d+),\s*height:\s*(\d+)/g)].map(([, w, h]) => `${w} × ${h}`));
    expect([...sizes].filter((size) => !matrix.includes(size))).toEqual([]);
  });

  it('says what every end-to-end spec plays', () => {
    const specs = readdirSync('tests/e2e/specs').filter((file) => /^[\w-]+\.spec\.ts$/.test(file));
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.filter((spec) => !matrix.includes(`| \`${spec}\``))).toEqual([]);
  });

  it('plays the café at each supported screen, landscape tablet to desktop', () => {
    for (const size of ['1180 × 820', '1280 × 800', '1512 × 982', '1920 × 1080'])
      expect(matrix).toMatch(new RegExp(`^\\| ${size} `, 'm'));
  });
});
