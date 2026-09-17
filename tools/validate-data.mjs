/** Campaign data check: manifest order plus per-shift level/lesson files. */
import { readFileSync } from 'node:fs';

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
    } else if (typeof parsed.solution !== 'string' || typeof parsed.starter !== 'string' || typeof parsed.note !== 'string') {
      failures.push(`lessons/${id}.json is missing note/solution/starter`);
    }
  }
}

if (failures.length) {
  console.error('validate:data failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`validate:data ok: ${ids.size} shifts (${[...ids].join(',')}).`);
