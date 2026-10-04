import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const docs = ['README.md', ...readdirSync('docs', { recursive: true, encoding: 'utf8' }).map((f) => join('docs', f))]
  .filter((f) => f.endsWith('.md'))
  // Stray iCloud copies, named "name 2.md", aren't part of the docs.
  .filter((f) => !/ \d+\.md$/.test(f));

/** Relative links in a markdown file, without their #anchor. */
function links(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)]
    .map(([, target]) => target.split('#')[0])
    .filter((target) => target && !/^[a-z]+:/.test(target));
}

describe('the documentation map', () => {
  it('has every relative link in the docs lead somewhere', () => {
    const broken = docs.flatMap((file) =>
      links(file)
        .filter((target) => !existsSync(join(dirname(file), decodeURI(target))))
        .map((target) => `${file} → ${target}`),
    );
    expect(broken).toEqual([]);
  });

  it('places every design note as current or historical, and is linked from the README', () => {
    const map = links('docs/README.md').map((target) => join('docs', target));
    const notes = docs.filter((f) => dirname(f) === join('docs', 'game_design') && !f.endsWith('README.md'));
    expect(notes.filter((note) => !map.includes(note))).toEqual([]);
    expect(links('README.md')).toContain('docs/README.md');
  });
});
