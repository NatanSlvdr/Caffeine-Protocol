import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SOUNDS } from '../../../src/shared/audio-manifest';
import { ready } from '../helpers';

test.describe.configure({ timeout: 180_000 });

test('offline reload retains the complete static game', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Caffeine Protocol' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose a shift', exact: true }).click();
  await expect(page.locator('.campaign-page')).toBeVisible();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch service' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('precache manifest covers every offline asset with a full content hash', async ({ page }) => {
  await ready(page);
  const swText = await page.evaluate(() => fetch('/sw.js').then((r) => r.text()));
  const versionMatch = swText.match(/prefix\+"([0-9a-f]{64})"/);
  expect(versionMatch, 'sw.js embeds a full 64-char sha256 revision (no truncation)').not.toBeNull();
  for (const sound of SOUNDS) expect(swText, `sw.js precaches audio ${sound}`).toContain(`./audio/${sound}.wav`);
  expect(swText).toContain('./icon.png');
  expect(swText).toContain('./index.html');

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const offline = names.filter((n) => n.includes('caffeine-'));
    const urls: string[] = [];
    for (const name of offline) urls.push(...(await caches.open(name).then((c) => c.keys())).map((r) => r.url));
    return urls;
  });
  const has = (suffix: string) => cachedUrls.some((u) => u.endsWith(suffix));
  expect(has('/index.html') || cachedUrls.some((u) => u.endsWith('/'))).toBe(true);
  expect(has('/icon.png')).toBe(true);
  for (const sound of SOUNDS) expect(has(`/audio/${sound}.wav`)).toBe(true);
});

test('offline upgrade rotates the precache and removes obsolete caches', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });
  });

  const cacheNames = () =>
    page.evaluate(() => caches.keys().then((keys) => keys.filter((k) => k.includes('caffeine-'))));
  const initial = await cacheNames();
  expect(initial).toHaveLength(1);
  const oldName = initial[0];
  const prefix = oldName.slice(0, oldName.length - 64);

  // Simulate a stale install left behind by an older release.
  const staleName = `${prefix}stale-obsolete-cache`;
  await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    await cache.put('/__stale__', new Response('stale'));
  }, staleName);

  // Simulate build B by publishing a byte-different sw.js with a new revision.
  const swPath = join(process.cwd(), 'dist', 'sw.js');
  const original = await readFile(swPath, 'utf8');
  const versionMatch = original.match(/prefix\+"([0-9a-f]{64})"/);
  expect(versionMatch, 'built sw.js embeds a full content-hash revision').not.toBeNull();
  const oldVersion = versionMatch![1];
  const flipped = oldVersion.endsWith('a') ? 'b' : 'a';
  const nextVersion = oldVersion.slice(0, -1) + flipped;
  const nextSource = original.replace(oldVersion, nextVersion);
  expect(nextSource).not.toBe(original);
  const nextName = `${prefix}${nextVersion}`;

  await writeFile(swPath, nextSource);
  try {
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update()));
    // New worker installs the new cache, activates, and deletes every other
    // prefixed cache (the previous build + the seeded stale entry).
    await expect.poll(async () => cacheNames(), { timeout: 60_000, intervals: [500] }).toContain(nextName);
    await expect.poll(async () => cacheNames(), { timeout: 60_000, intervals: [500] }).toEqual([nextName]);

    const served = await page.evaluate(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      const urls = keys.map((r) => r.url);
      const index = (await cache.match('/index.html')) ?? (await cache.match('/'));
      return {
        urls,
        hasIndex:
          (await index
            ?.text()
            .then((t) => t.length)
            .catch(() => 0)) ?? 0,
      };
    }, nextName);
    expect(served.urls.some((u) => u.endsWith('/index.html') || u.endsWith('/'))).toBe(true);
    expect(served.urls.some((u) => u.endsWith('/icon.png'))).toBe(true);
    expect(served.hasIndex).toBeGreaterThan(0);

    // The upgraded worker still serves the app offline.
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Caffeine Protocol' })).toBeVisible();
  } finally {
    await writeFile(swPath, original);
    await context.setOffline(false);
  }
});
