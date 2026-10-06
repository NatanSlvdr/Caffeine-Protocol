// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = join(dirname(fileURLToPath(import.meta.url)), '../../../src/styles');
const FILES = ['tokens.css', 'themes/playful.css', 'base.css', 'shell.css', 'dialogue.css'] as const;
type File = (typeof FILES)[number];

/** Every rule of a stylesheet, innermost blocks only: its selectors and declarations. */
const rules = (file: File) =>
  [
    ...readFileSync(join(styles, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .matchAll(/([^{}]+)\{([^{}]*)\}/g),
  ].map(([, selector, body]) => ({
    selectors: selector.split(',').map((part) => part.trim().replace(/\s+/g, ' ')),
    declarations: new Map(
      [...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, property, value]) => [property, value.trim()]),
    ),
  }));
const sheets = new Map(FILES.map((file) => [file, rules(file)]));

/** What the last rule for exactly this selector in this file declares for the property. */
function declared(file: File, selector: string, property: string): string {
  const rule = sheets
    .get(file)!
    .findLast((rule) => rule.selectors.includes(selector) && rule.declarations.has(property));
  if (!rule) throw new Error(`${file} has no ${property} for ${selector}`);
  return rule.declarations.get(property)!;
}

/** A colour token: the theme's own on :root, else the one place the stylesheets set it. */
function token(name: string): string {
  const all = FILES.flatMap((file) =>
    sheets
      .get(file)!
      .filter((rule) => rule.declarations.has(name))
      .map((rule) => ({ file, rule })),
  );
  const root = all.findLast(({ rule }) => rule.selectors.includes(':root'));
  if (!root && all.length !== 1) throw new Error(`${name} is set in ${all.length} places`);
  return (root ?? all[0]).rule.declarations.get(name)!;
}

/** A colour as #rrggbb, through any tokens it is written with. */
function hex(value: string): string {
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (reference) return hex(token(reference[1]));
  if (value === 'white') return '#ffffff';
  const short = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  throw new Error(`not a solid colour: ${value}`);
}

/** WCAG 2 contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const luminance = (colour: string) => {
    const [r, g, b] = [1, 3, 5].map((at) => {
      const channel = parseInt(hex(colour).slice(at, at + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Text the café prints at body sizes, and what it sits on. All of it is under 18px, so each needs 4.5:1. */
const PAIRS: [label: string, text: string, ground: string][] = [
  [
    'paragraphs on the page',
    declared('themes/playful.css', 'p', 'color'),
    declared('themes/playful.css', 'body', 'background'),
  ],
  ['muted notes on a card', 'var(--muted)', 'var(--card)'],
  ['Settings and help slips, quiet lines', 'var(--slip-muted)', 'var(--slip-paper)'],
  // The other paper the shell prints on shares one quiet ink.
  ['the front door’s menu ticket, quiet lines', 'var(--front-muted)', 'var(--front-paper)'],
  ['the campaign’s tickets, quiet lines', 'var(--pass-muted)', 'var(--pass-paper)'],
  ['the closing receipt, quiet lines', 'var(--story-muted)', 'var(--story-paper)'],
  ['a scene’s dialogue box, quiet lines', 'var(--dialogue-muted)', 'var(--dialogue-paper)'],
  [
    'the lesson pinned to the help slip',
    declared('shell.css', '.help-slip .lesson-note', 'color'),
    declared('shell.css', '.help-slip .lesson-note', 'background'),
  ],
  [
    'the routine a restore would bring back',
    declared('shell.css', '.restore-diff', 'color'),
    declared('shell.css', '.restore-diff', 'background'),
  ],
  [
    'why a notebook page doesn’t fit the open robot',
    declared('shell.css', '.restore-version small.notebook-unfit', 'color'),
    'var(--slip-paper)',
  ],
  [
    'a regular’s signature in the guestbook',
    declared('shell.css', '.guestbook-notes cite', 'color'),
    'var(--slip-paper)',
  ],
  [
    'a keepsake that is on the shelf',
    declared('shell.css', '.shelf-keepsakes li.earned small', 'color'),
    'var(--slip-paper)',
  ],
  [
    'a mark beside a routine in the drills',
    declared('shell.css', '.block-line-mark', 'color'),
    declared('shell.css', '.drill-routine', 'background'),
  ],
  [
    'the block a paused moment ran next',
    declared('shell.css', '.block-line.next .block-line-mark', 'color'),
    declared('shell.css', '.drill-routine', 'background'),
  ],
  ['a guest’s quiet line in their bubble', 'var(--bubble-quiet)', 'var(--bubble-paper)'],
  ['a guest’s quiet line on the bubble’s well', 'var(--bubble-quiet)', 'var(--bubble-well)'],
  [
    'a danger button',
    declared('themes/playful.css', '.danger', 'color'),
    declared('themes/playful.css', '.danger', 'background'),
  ],
  [
    'a confirm slip’s danger button',
    declared('shell.css', '.confirm-slip .modal-buttons > button:last-child', 'color'),
    declared('shell.css', '.confirm-slip .modal-buttons > button.danger:last-child', 'background'),
  ],
  [
    'a to-go tag',
    declared('themes/playful.css', '.order-mark', 'color'),
    declared('themes/playful.css', '.order-mark', 'background'),
  ],
  [
    'a rush tag',
    declared('themes/playful.css', '.order-mark.rush', 'color'),
    declared('themes/playful.css', '.order-mark.rush', 'background'),
  ],
];

describe('text the café prints', () => {
  it.each(PAIRS)('%s reads at 4.5:1 or better', (_, text, ground) => {
    expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5);
  });

  it('measures contrast the way WCAG does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrast('#fff', 'white')).toBe(1);
  });
});
