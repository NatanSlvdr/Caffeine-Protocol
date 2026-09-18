/** Campaign data check: manifest order plus per-shift level/lesson files. */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../src/data/campaign/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));

const failures = [];
if (!Array.isArray(manifest.order) || manifest.order.length === 0) failures.push('manifest order is empty');
const ids = new Set();
for (const id of manifest.order ?? []) {
  if (ids.has(id)) failures.push(`duplicate manifest id: ${id}`);
  ids.add(id);
  for (const kind of ['levels', 'lessons']) {
    let parsed = null;
    try {
      parsed = JSON.parse(readFileSync(new URL(`${kind}/${id}.json`, root), 'utf8'));
    } catch {
      failures.push(`unreadable ${kind}/${id}.json`);
      continue;
    }
    if (kind === 'levels') {
      if (parsed.id !== id) failures.push(`levels/${id}.json id mismatch: ${parsed.id}`);
      if (!Array.isArray(parsed.seeds) || parsed.seeds.length === 0) failures.push(`level ${id} has no seeds`);
    } else if (
      typeof parsed.solution !== 'string' ||
      typeof parsed.starter !== 'string' ||
      typeof parsed.note !== 'string'
    ) {
      failures.push(`lessons/${id}.json is missing note/solution/starter`);
    }
  }
}

if (failures.length) {
  console.error('validate:data failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

// Every sound in the shared manifest must ship in public/audio byte-identical to
// the source of truth in assets/audio (ADR 003); the icon likewise. Existence
// alone is not enough: a stale served copy must fail the build loudly.
const manifestSrc = readFileSync(new URL('../src/shared/audio-manifest.ts', import.meta.url), 'utf8');
const soundsBlock = manifestSrc.match(/SOUNDS\s*=\s*\[([\s\S]*?)\]/)?.[1];
const sounds = soundsBlock ? [...soundsBlock.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [];
if (sounds.length === 0) failures.push('audio manifest SOUNDS is empty or unreadable');
const sha256 = (url) => createHash('sha256').update(readFileSync(url)).digest('hex');
for (const sound of sounds) {
  const src = new URL(`../assets/audio/${sound}.wav`, import.meta.url);
  const dst = new URL(`../public/audio/${sound}.wav`, import.meta.url);
  if (!existsSync(src)) failures.push(`missing source assets/audio/${sound}.wav`);
  else if (!existsSync(dst)) failures.push(`missing public/audio/${sound}.wav`);
  else if (sha256(src) !== sha256(dst))
    failures.push(`stale public/audio/${sound}.wav (diverges from assets/audio/${sound}.wav; run npm run audio:sync)`);
}
const iconSrc = new URL('../assets/icon.svg', import.meta.url);
const iconDst = new URL('../public/icon.svg', import.meta.url);
if (!existsSync(iconSrc)) failures.push('missing source assets/icon.svg');
else if (!existsSync(iconDst)) failures.push('missing public/icon.svg');
else if (sha256(iconSrc) !== sha256(iconDst))
  failures.push('stale public/icon.svg (diverges from assets/icon.svg; run npm run audio:sync)');
if (failures.length) {
  console.error('validate:data failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

// The generated campaign table is committed; it must match its sources.
try {
  execFileSync(process.execPath, [fileURLToPath(new URL('./docs-gen.mjs', import.meta.url)), '--check'], {
    stdio: 'inherit',
  });
} catch {
  failures.push('docs/campaign/README.md is stale (run npm run docs:gen)');
}
if (failures.length) {
  console.error('validate:data failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`validate:data ok: ${ids.size} shifts (${[...ids].join(',')}).`);
