/**
 * Sync generated audio + icon from source-of-truth assets/ into served public/.
 *
 * Source of truth (ADR 003):
 * - `assets/audio/<id>.wav` for every id in `src/shared/audio-manifest.ts` (SOUNDS)
 * - `assets/icon.svg`
 * Served copies: `public/audio/<id>.wav` and `public/icon.svg`.
 *
 * Usage:
 * - `npm run audio:sync` (default) copies every manifest sound + the icon into public/.
 * - `node tools/audio-sync.mjs --check` verifies byte equality without writing;
 *   exits 1 on any missing/divergent file (CI enforcement, also wired via `prebuild`).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

/** Sound ids from the single source of truth: SOUNDS in src/shared/audio-manifest.ts. */
function readSoundIds() {
  const manifestSrc = readFileSync(join(root, 'src/shared/audio-manifest.ts'), 'utf8');
  const block = manifestSrc.match(/SOUNDS\s*=\s*\[([\s\S]*?)\]/)?.[1];
  if (block == null) throw new Error('audio:sync: cannot locate SOUNDS array in src/shared/audio-manifest.ts');
  const ids = [...block.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (ids.length === 0) throw new Error('audio:sync: SOUNDS manifest is empty');
  return ids;
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** [source, served] pairs: every manifest sound plus the icon. */
function assetPairs() {
  const pairs = readSoundIds().map((id) => [`assets/audio/${id}.wav`, `public/audio/${id}.wav`]);
  pairs.push(['assets/icon.svg', 'public/icon.svg']);
  return pairs;
}

/** Compare sources against served copies; returns failure messages (empty when in sync). */
function verify(pairs) {
  const failures = [];
  for (const [from, to] of pairs) {
    const src = join(root, from);
    const dst = join(root, to);
    if (!existsSync(src)) {
      failures.push(`missing source ${from}`);
      continue;
    }
    if (!existsSync(dst)) {
      failures.push(`missing served copy ${to} (diverges from ${from}; run npm run audio:sync)`);
      continue;
    }
    if (sha256(src) !== sha256(dst)) {
      failures.push(`stale ${to} (diverges from ${from}; run npm run audio:sync)`);
    }
  }
  return failures;
}

const pairs = assetPairs();

if (CHECK) {
  const failures = verify(pairs);
  if (failures.length) {
    console.error('audio:sync --check failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log(`audio:sync --check ok: ${pairs.length} files in sync.`);
} else {
  for (const [from, to] of pairs) {
    const src = join(root, from);
    const dst = join(root, to);
    if (!existsSync(src)) {
      console.error(`audio:sync failed: missing source ${from}`);
      process.exit(1);
    }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    console.log(`audio:sync ${src} -> ${dst}`);
  }
}
