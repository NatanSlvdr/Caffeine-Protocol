import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { payload, payloadErrors } from '../../../tools/size-check.mjs';

let dist = '';
afterEach(() => rmSync(dist, { recursive: true, force: true }));

/** A small build: a page loading an entry, preloading a chunk and a stylesheet, and art it doesn't load up front. */
function build(entry: Buffer) {
  dist = mkdtempSync(join(tmpdir(), 'size-check-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(
    join(dist, 'index.html'),
    '<link rel="icon" href="./icon.png"><script type="module" src="./assets/index-a.js"></script>' +
      '<link rel="modulepreload" href="./assets/cafe-3d-b.js"><link rel="stylesheet" href="./assets/index-c.css">',
  );
  writeFileSync(join(dist, 'assets/index-a.js'), entry);
  writeFileSync(join(dist, 'assets/cafe-3d-b.js'), 'export const cafe = 1;');
  writeFileSync(join(dist, 'assets/index-c.css'), 'body { color: red }');
  writeFileSync(join(dist, 'assets/01-d.webp'), randomBytes(4096));
  writeFileSync(join(dist, 'icon.png'), randomBytes(512));
}

describe('the build size check', () => {
  it('weighs what the page loads before it draws, gzipped, apart from the art and the icon', () => {
    build(Buffer.from('console.log(1);'.repeat(1000)));
    const weighed = payload(dist);
    expect(weighed.startupFiles).toEqual(['assets/index-a.js', 'assets/cafe-3d-b.js', 'assets/index-c.css']);
    // Repetitive code gzips to a fraction of its 15,000 bytes.
    expect(weighed.startup).toBeGreaterThan(50);
    expect(weighed.startup).toBeLessThan(500);
    expect(weighed.total).toBeGreaterThan(15000 + 4096 + 512);
  });

  it('names each budget a build goes over, and passes one that fits', () => {
    // Random bytes don't compress, so the entry weighs its full 64 KiB gzipped too.
    build(randomBytes(64 * 1024));
    expect(payloadErrors(dist, { startup: 1024 * 1024, total: 1024 * 1024 })).toEqual([]);
    expect(payloadErrors(dist, { startup: 32 * 1024, total: 32 * 1024 })).toEqual([
      expect.stringMatching(/^startup scripts and styles weigh 64 KiB gzipped, over the 32 KiB budget$/),
      expect.stringMatching(/^the build weighs 69 KiB, over the 32 KiB budget$/),
    ]);
  });
});
