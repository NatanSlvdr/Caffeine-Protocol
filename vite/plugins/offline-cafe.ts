import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { SOUNDS } from '../../src/shared/audio-manifest';

/** One precached URL with the exact bytes that will be served for it. */
export interface PrecacheEntry {
  path: string;
  content: string | Uint8Array;
}

/**
 * Deterministic precache manifest: every URL the service worker will
 * `cache.addAll()`, including static `public/` assets (icon, audio) that never
 * appear in the Rollup bundle. Sorted + deduped so builds are reproducible.
 */
export function buildPrecacheFiles(bundleFileNames: readonly string[], audio: readonly string[] = SOUNDS): string[] {
  const files = [
    './',
    './index.html',
    './icon.svg',
    ...bundleFileNames.filter((f) => f !== 'sw.js').map((f) => './' + f),
    ...audio.map((f) => `./audio/${f}.wav`),
  ];
  return [...new Set(files)].sort();
}

/**
 * Content-hash revision over the complete precache manifest.
 *
 * - Sorts by URL so bundle enumeration order cannot affect the result.
 * - Hashes `path + NUL + content + NUL` per entry so renames and content
 *   edits both change the revision.
 * - Returns the full 64-char sha256 hex digest: no truncation, so no change
 *   can hide behind a sliced suffix.
 */
export function hashPrecacheRevision(entries: readonly PrecacheEntry[]): string {
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const hash = createHash('sha256');
  for (const entry of sorted) {
    hash.update(entry.path);
    hash.update('\0');
    hash.update(typeof entry.content === 'string' ? entry.content : entry.content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** Service-worker source for a given cache revision + precache manifest. */
export function buildServiceWorkerSource(version: string, files: readonly string[]): string {
  return `const prefix='caffeine-'+encodeURIComponent(self.registration.scope)+'-';const name=prefix+${JSON.stringify(version)};const files=${JSON.stringify(files)};self.addEventListener('install',event=>event.waitUntil(caches.open(name).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==name).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));});`;
}

/** Hash the bytes Vite actually wrote, including its final index.html. */
export async function writeOfflineServiceWorker(
  outputDir: string,
  bundleFileNames: readonly string[],
  audio: readonly string[] = SOUNDS,
): Promise<void> {
  const files = buildPrecacheFiles(bundleFileNames, audio);
  const entries = await Promise.all(
    files.map(async (url): Promise<PrecacheEntry> => {
      const key = url === './' ? 'index.html' : url.slice(2);
      return { path: url, content: await readFile(join(outputDir, key)) };
    }),
  );
  const version = hashPrecacheRevision(entries);
  await writeFile(join(outputDir, 'sw.js'), buildServiceWorkerSource(version, files));
}

/** Precache the complete static game, including the original soundtrack, for offline reloads. */
export function createOfflineCafe({ audio = SOUNDS }: { audio?: readonly string[] } = {}): Plugin {
  let outputDir: string | undefined;
  let bundleFileNames: string[] | undefined;
  return {
    name: 'offline-cafe',
    configResolved(config) {
      outputDir = resolve(config.root, config.build.outDir);
    },
    generateBundle(_, bundle) {
      bundleFileNames = Object.keys(bundle);
    },
    async closeBundle() {
      if (outputDir && bundleFileNames) await writeOfflineServiceWorker(outputDir, bundleFileNames, audio);
    },
  };
}
