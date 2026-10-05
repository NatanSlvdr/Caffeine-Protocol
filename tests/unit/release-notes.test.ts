import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SOUNDS } from '../../src/shared/audio-manifest';

const notes = readFileSync('docs/RELEASE.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string;
  dependencies: Record<string, string>;
};
/** The release page's markdown section under this heading. */
const section = (heading: string) => notes.split(`\n## ${heading}\n`)[1]?.split('\n## ')[0] ?? '';
/** The table rows of a section, as their cells. */
const rows = (heading: string) =>
  section(heading)
    .split('\n')
    .filter((line) => line.startsWith('| ') && !/^\| -/.test(line))
    .slice(1)
    .map((line) =>
      line
        .slice(1, -1)
        .split(' | ')
        .map((cell) => cell.trim()),
    );
const folders = (dir: string) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

describe('the release notes', () => {
  it('are for the version the package is at', () => {
    expect(notes).toContain(`\n## Version ${pkg.version}\n`);
  });

  it('credit every library the game ships, at the version and under the licence installed', () => {
    const credited = new Map(rows('Credits').map(([name, version, licence]) => [name, { version, licence }]));
    for (const name of Object.keys(pkg.dependencies)) {
      const installed = JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8')) as {
        version: string;
        license: string;
      };
      expect(credited.get(name), name).toEqual({ version: installed.version, licence: installed.license });
    }
    expect([...credited.keys()].filter((name) => !(name in pkg.dependencies))).toEqual([]);
  });

  it('say where every portrait, cutscene and sound came from', () => {
    const provenance = section('Asset provenance');
    const named = (asset: string) => provenance.includes(`\`${asset}\``);
    expect(folders('src/assets/portraits').filter((who) => !named(who))).toEqual([]);
    expect(folders('src/assets/cutscenes').filter((scene) => !named(scene))).toEqual([]);
    expect(SOUNDS.filter((sound) => !named(sound))).toEqual([]);
    // No model or image texture ships, as the page says: the café is drawn in code.
    const shipped = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((file) =>
      /\.(glb|gltf|fbx|obj|ktx2)$/i.test(file),
    );
    expect(shipped).toEqual([]);
    // Every tool the page names to make an asset is there.
    for (const [, tool] of provenance.matchAll(/`(tools\/[\w/.-]+)`/g)) expect(existsSync(tool), tool).toBe(true);
  });

  it('list the keys the in-game guide teaches', () => {
    const controls = section('Controls');
    for (const key of ['F9', 'Shift + Alt + F', 'Ctrl/⌘ + Z', 'Ctrl/⌘ + Shift + Z', 'Ctrl/⌘ + Enter', 'Esc', 'Space'])
      expect(controls, key).toContain(`<kbd>${key}</kbd>`);
    const guide = readFileSync('src/app/GuideWindow.tsx', 'utf8');
    const taught = [...guide.matchAll(/<kbd>([^<{]+)<\/kbd>/g)].map(([, key]) => key);
    expect(taught.length).toBeGreaterThan(0);
    expect(taught.filter((key) => !controls.includes(`<kbd>${key}</kbd>`))).toEqual([]);
  });
});
