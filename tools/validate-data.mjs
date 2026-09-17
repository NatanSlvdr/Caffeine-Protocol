/** Minimal campaign data check (Phase 0). Phase 3 upgrades this to valibot schema validation. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const campaign = JSON.parse(readFileSync(new URL('../src/data/campaign.json', import.meta.url), 'utf8'));

const failures = [];
const ids = new Set();
for (const level of campaign.levels ?? []) {
  if (typeof level.id !== 'string' || !level.id) failures.push(`level missing id: ${JSON.stringify(level).slice(0, 80)}`);
  if (ids.has(level.id)) failures.push(`duplicate level id: ${level.id}`);
  ids.add(level.id);
  if (!Array.isArray(level.seeds) || level.seeds.length === 0) failures.push(`level ${level.id} has no seeds`);
}
if ((campaign.lessons ?? []).length !== (campaign.levels ?? []).length) {
  failures.push(
    `lessons (${(campaign.lessons ?? []).length}) and levels (${(campaign.levels ?? []).length}) counts differ`,
  );
}

let serviceTargets = null;
try {
  serviceTargets = require('../src/data/service-targets.json');
} catch {
  failures.push('service-targets.json is not parseable');
}
if (!Array.isArray(serviceTargets)) failures.push('service-targets.json is not an array');

if (failures.length) {
  console.error('validate:data failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`validate:data ok: ${ids.size} levels, ${campaign.lessons.length} lessons, ${serviceTargets.length} service targets.`);
