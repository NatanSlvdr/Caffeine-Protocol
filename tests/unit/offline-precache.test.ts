import { describe, it, expect } from 'vitest';
import {
  buildPrecacheFiles,
  buildServiceWorkerSource,
  bundleEntryContent,
  hashPrecacheRevision,
} from '../../vite/plugins/offline-cafe';

/** Legacy fragile revision from before the fix (bundle keys joined + sliced). */
function legacyVersion(bundleKeys: string[]): string {
  return bundleKeys
    .join('-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(-180);
}

describe('offline precache revision', () => {
  it('is deterministic regardless of entry order', () => {
    const a = hashPrecacheRevision([
      { path: './index.html', content: '<html/>' },
      { path: './icon.png', content: 'png' },
      { path: './audio/click.wav', content: new Uint8Array([1, 2, 3]) },
    ]);
    const b = hashPrecacheRevision([
      { path: './audio/click.wav', content: new Uint8Array([1, 2, 3]) },
      { path: './icon.png', content: 'png' },
      { path: './index.html', content: '<html/>' },
    ]);
    expect(a).toBe(b);
  });

  it('returns a full sha256 hex digest with no lossy truncation', () => {
    const revision = hashPrecacheRevision([{ path: './index.html', content: 'x' }]);
    expect(revision).toMatch(/^[0-9a-f]{64}$/);
    expect(revision).toHaveLength(64);
  });

  it('changes when bundle content changes even if filenames are identical', () => {
    const a = hashPrecacheRevision([
      { path: './assets/app.js', content: 'console.log(1)' },
      { path: './index.html', content: '<html/>' },
    ]);
    const b = hashPrecacheRevision([
      { path: './assets/app.js', content: 'console.log(2)' },
      { path: './index.html', content: '<html/>' },
    ]);
    expect(a).not.toBe(b);
  });

  it('covers static public assets (icon + audio) that never appear in the bundle', () => {
    const base = [
      { path: './index.html', content: '<html/>' },
      { path: './icon.png', content: 'png-one' },
      { path: './audio/click.wav', content: new Uint8Array([1, 2, 3]) },
    ] as const;
    const iconChanged = hashPrecacheRevision([
      { path: './index.html', content: '<html/>' },
      { path: './icon.png', content: 'png-two' },
      { path: './audio/click.wav', content: new Uint8Array([1, 2, 3]) },
    ]);
    const audioChanged = hashPrecacheRevision([
      { path: './index.html', content: '<html/>' },
      { path: './icon.png', content: 'png-one' },
      { path: './audio/click.wav', content: new Uint8Array([9, 9, 9]) },
    ]);
    expect(hashPrecacheRevision([...base])).not.toBe(iconChanged);
    expect(hashPrecacheRevision([...base])).not.toBe(audioChanged);
  });

  it('does not hide early-manifest changes behind truncation (the old slice(-180) bug)', () => {
    // Many bundle keys where the only change is at the front: the legacy
    // `.slice(-180)` keeps just the tail and collides, the content hash does not.
    const tail = Array.from({ length: 40 }, (_, i) => `assets/chunk-${String(i).padStart(3, '0')}.js`);
    const beforeKeys = ['assets/app-v1.js', ...tail];
    const afterKeys = ['assets/app-v2.js', ...tail];
    expect(legacyVersion(beforeKeys)).toBe(legacyVersion(afterKeys));

    const toEntries = (keys: string[]) => keys.map((k) => ({ path: './' + k, content: `// ${k}` }));
    expect(hashPrecacheRevision(toEntries(beforeKeys))).not.toBe(hashPrecacheRevision(toEntries(afterKeys)));
  });

  it('simulates build A -> build B: any precached byte change rotates the revision', () => {
    const buildA = [
      { path: './', content: '<html>a</html>' },
      { path: './index.html', content: '<html>a</html>' },
      { path: './icon.png', content: 'png-a' },
      { path: './assets/app.js', content: 'v1' },
      { path: './audio/morning_loop.wav', content: new Uint8Array([1]) },
    ];
    const buildB = buildA.map((e) =>
      e.path === './audio/morning_loop.wav' ? { ...e, content: new Uint8Array([2]) } : e,
    );
    const revA = hashPrecacheRevision(buildA);
    const revB = hashPrecacheRevision(buildB);
    expect(revA).toMatch(/^[0-9a-f]{64}$/);
    expect(revB).toMatch(/^[0-9a-f]{64}$/);
    expect(revA).not.toBe(revB);
  });

  it('builds a sorted, deduped manifest covering bundle outputs + icon + audio', () => {
    const files = buildPrecacheFiles(['assets/app.js', 'index.html', 'sw.js'], ['click', 'serve']);
    expect(files).toContain('./');
    expect(files).toContain('./index.html');
    expect(files).toContain('./icon.png');
    expect(files).toContain('./assets/app.js');
    expect(files).toContain('./audio/click.wav');
    expect(files).toContain('./audio/serve.wav');
    expect(files).not.toContain('./sw.js');
    expect([...files].sort()).toEqual(files);
    expect(new Set(files).size).toBe(files.length);
  });

  it('reads both chunk code and asset source from bundle entries', () => {
    expect(bundleEntryContent({ code: 'js' })).toBe('js');
    const bytes = new Uint8Array([7]);
    expect(bundleEntryContent({ source: bytes })).toBe(bytes);
    expect(bundleEntryContent({ source: 'css' })).toBe('css');
    expect(bundleEntryContent({})).toBeUndefined();
  });

  it('emits an upgrade-safe worker: skipWaiting, claim, and obsolete-cache cleanup', () => {
    const source = buildServiceWorkerSource('a'.repeat(64), ['./index.html']);
    expect(source).toContain('skipWaiting');
    expect(source).toContain('clients.claim');
    expect(source).toContain('caches.delete');
    expect(source).toContain('k!==name');
    expect(source).toContain('startsWith(prefix)');
    expect(source).toContain('a'.repeat(64));
  });
});
