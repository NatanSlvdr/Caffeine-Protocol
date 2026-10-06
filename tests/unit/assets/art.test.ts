import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { levels } from '../../../src/data';
import { cutscenes } from '../../../src/data/campaign/cutscenes';
import { shiftIntro, shiftOutro } from '../../../src/data/campaign/dialogue';
import { memories } from '../../../src/data/memories';
import { specials } from '../../../src/data/specials';
import { CAST_IDS, MOODS } from '../../../src/domain/dialogue';
import { REGULAR_NAMES } from '../../../src/domain/regulars';
import { artErrors, webpInfo } from '../../../tools/art-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const shipped = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((name) => !name.startsWith('.') && !/\s\d+\.webp$/.test(name))
    .map((name) => name.replace(/\.webp$/, ''));

describe('the art the game ships', () => {
  it('matches its sources, and the size and transparency each frame needs', () => {
    expect(artErrors(root)).toEqual([]);
  });

  it('has one still per panel for every scene, and no other scene', () => {
    expect(shipped('src/assets/cutscenes').sort()).toEqual(cutscenes.map((scene) => scene.id).sort());
    for (const scene of cutscenes)
      expect(shipped(`src/assets/cutscenes/${scene.id}`), scene.id).toEqual(
        scene.panels.map((_, index) => String(index + 1).padStart(2, '0')),
      );
  });

  it('has a portrait for every character, in moods the dialogue knows', () => {
    expect(shipped('src/assets/portraits').sort()).toEqual([...CAST_IDS].sort());
    for (const id of CAST_IDS)
      for (const mood of shipped(`src/assets/portraits/${id}`)) expect(MOODS, `${id}/${mood}`).toContain(mood);
  });

  it('has a face for every mood the story asks for, but the few still to draw, and none it never shows', () => {
    const lines = [
      // Every line a scene can say: the ones recalling an answer, and each answer's own.
      ...cutscenes
        .flatMap((scene) => scene.panels.flatMap((panel) => panel.lines))
        .flatMap((each) => [each, ...(each.choice?.options.flatMap((option) => option.lines) ?? [])]),
      ...levels.flatMap((_, shift) => [...shiftIntro(shift), ...shiftOutro(shift)]),
      ...[...specials, ...memories].flatMap((extra) => [...extra.intro, ...extra.outro]),
    ];
    const asked = new Set(lines.flatMap((l) => (l.who && l.mood ? [`${l.who}/${l.mood}`] : [])));
    // A guest who got the wrong thing reacts worried, as themselves if they're a regular.
    for (const who of ['guest', ...Object.keys(REGULAR_NAMES)]) asked.add(`${who}/worried`);
    const drawn = new Set(
      CAST_IDS.flatMap((id) => shipped(`src/assets/portraits/${id}`).map((mood) => `${id}/${mood}`)),
    );
    // These fall back to neutral until they're drawn: see docs/game_design/art_audit.md.
    expect([...asked].filter((mood) => !drawn.has(mood)).sort()).toEqual([
      'albert/worried',
      'guest/happy',
      'pip/happy',
      'pip/surprised',
      'pip/worried',
      'rosa/worried',
    ]);
    expect([...drawn].filter((mood) => !mood.endsWith('/neutral') && !asked.has(mood))).toEqual([]);
  });
});

describe('checking the art', () => {
  let scratch = '';
  afterEach(() => {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    scratch = '';
  });
  /** A copy of one scene and one character, with sources, to break on purpose. */
  function sample() {
    scratch = mkdtempSync(join(tmpdir(), 'art-check-'));
    for (const [from, files] of [
      ['assets/cutscenes/the-keys', ['01.png', '02.png']],
      ['src/assets/cutscenes/the-keys', ['01.webp', '02.webp']],
      ['assets/portraits/niko', ['neutral.png', 'happy.png']],
      ['src/assets/portraits/niko', ['neutral.webp', 'happy.webp']],
    ] as const) {
      mkdirSync(join(scratch, from), { recursive: true });
      for (const file of files) copyFileSync(join(root, from, file), join(scratch, from, file));
    }
    return scratch;
  }

  it('passes a faithful copy, and skips sync conflict copies', () => {
    const dir = sample();
    copyFileSync(
      join(dir, 'src/assets/cutscenes/the-keys/01.webp'),
      join(dir, 'src/assets/cutscenes/the-keys/01 2.webp'),
    );
    expect(artErrors(dir)).toEqual([]);
  });

  it('names a source never converted, a conversion with no source, a gap in the panels, and a picture twice', () => {
    const dir = sample();
    writeFileSync(join(dir, 'assets/portraits/niko/worried.png'), '');
    rmSync(join(dir, 'assets/cutscenes/the-keys/01.png'));
    rmSync(join(dir, 'src/assets/cutscenes/the-keys/01.webp'));
    copyFileSync(join(dir, 'assets/cutscenes/the-keys/02.png'), join(dir, 'assets/cutscenes/the-keys/03.png'));
    copyFileSync(
      join(dir, 'src/assets/cutscenes/the-keys/02.webp'),
      join(dir, 'src/assets/cutscenes/the-keys/03.webp'),
    );
    rmSync(join(dir, 'assets/portraits/niko/happy.png'));
    expect(artErrors(dir)).toEqual([
      'src/assets/cutscenes/the-keys/03.webp is the same image as src/assets/cutscenes/the-keys/02.webp',
      'src/assets/cutscenes/the-keys/02.webp is out of order: expected 01',
      'src/assets/cutscenes/the-keys/03.webp is out of order: expected 02',
      'assets/portraits/niko/worried.png isn’t converted (run python3 tools/portraits.py)',
      'src/assets/portraits/niko/happy.webp has no source in assets/portraits/niko',
    ]);
  });

  it('names art of the wrong size or transparency, a missing neutral, and a file that isn’t a WebP', () => {
    const dir = sample();
    // A portrait where a still belongs, and the other way round.
    copyFileSync(join(dir, 'src/assets/portraits/niko/happy.webp'), join(dir, 'src/assets/cutscenes/the-keys/02.webp'));
    copyFileSync(join(dir, 'src/assets/cutscenes/the-keys/01.webp'), join(dir, 'src/assets/portraits/niko/happy.webp'));
    rmSync(join(dir, 'src/assets/portraits/niko/neutral.webp'));
    rmSync(join(dir, 'assets/portraits/niko/neutral.png'));
    writeFileSync(join(dir, 'src/assets/cutscenes/the-keys/01.webp'), 'not an image');
    expect(artErrors(dir)).toEqual([
      'src/assets/cutscenes/the-keys/01.webp: not a WebP',
      'src/assets/cutscenes/the-keys/02.webp is 768 × 1024, not 1920 × 1080',
      'src/assets/cutscenes/the-keys/02.webp has transparency it shouldn’t',
      'src/assets/portraits/niko/happy.webp is 1920 × 1080, not 768 × 1024',
      'src/assets/portraits/niko/happy.webp has no transparency',
      'src/assets/portraits/niko has no neutral.webp',
    ]);
    expect(existsSync(join(root, 'src/assets/portraits/niko/neutral.webp'))).toBe(true);
  });

  it('reads the size of a lossless WebP too', () => {
    const body = Buffer.alloc(5);
    body[0] = 0x2f;
    body.writeUInt32LE((768 - 1) | ((1024 - 1) << 14) | (1 << 28), 1);
    const header = Buffer.alloc(20);
    header.write('RIFF', 0);
    header.writeUInt32LE(12 + body.length + 5, 4);
    header.write('WEBP', 8);
    header.write('VP8L', 12);
    header.writeUInt32LE(body.length, 16);
    expect(webpInfo(Buffer.concat([header, body, Buffer.alloc(5)]))).toEqual({ width: 768, height: 1024, alpha: true });
  });
});
