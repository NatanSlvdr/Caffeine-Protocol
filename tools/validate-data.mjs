/** Campaign data check: Act I files plus generated extension shifts via shared validators. */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  collectNarrativeErrors,
  collectSeedErrors,
  extensionActiveTables,
  extensionAct,
  extensionServiceForLevel,
  validateCampaign,
  validateExtensionSeedData,
  validateLessonData,
  validateLevelData,
  validateManifestData,
} from '../src/data/campaign/validate.ts';
import { extensionSeeds } from '../src/data/campaign/extension-seeds.ts';
import { campaignNarrative } from '../src/data/campaign/narrative.ts';
import { extensionSeed } from '../src/data/campaign/generators/extensionCustomers.ts';

const root = new URL('../src/data/campaign/', import.meta.url);
const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const manifest = readJson(new URL('manifest.json', root));

const failures = [];
for (const error of validateManifestData(manifest)) failures.push(error);

const actLevels = [];
const actLessons = [];
for (const id of manifest.order ?? []) {
  let levelRaw = null;
  let lessonRaw = null;
  try {
    levelRaw = readJson(new URL(`levels/${id}.json`, root));
  } catch {
    failures.push(`unreadable levels/${id}.json`);
  }
  try {
    lessonRaw = readJson(new URL(`lessons/${id}.json`, root));
  } catch {
    failures.push(`unreadable lessons/${id}.json`);
  }
  if (levelRaw) {
    for (const error of validateLevelData(levelRaw)) failures.push(`levels/${id}.json: ${error}`);
    if (levelRaw.id !== id) failures.push(`levels/${id}.json id mismatch: ${levelRaw.id}`);
    actLevels.push(levelRaw);
  }
  if (lessonRaw) {
    for (const error of validateLessonData(lessonRaw)) failures.push(`lessons/${id}.json: ${error}`);
    actLessons.push(lessonRaw);
  }
}

const seenExtension = new Set();
extensionSeeds.forEach((seed, index) => {
  for (const error of validateExtensionSeedData(seed)) failures.push(`extension-seeds[${index}]: ${error}`);
  if (seenExtension.has(seed.id)) failures.push(`duplicate extension seed id: ${seed.id}`);
  seenExtension.add(seed.id);
});

for (const error of collectNarrativeErrors(campaignNarrative)) failures.push(error);
for (const error of validateCampaign({
  manifestOrder: manifest.order ?? [],
  actLevels,
  actLessons,
  narrative: campaignNarrative,
  extensionSeeds,
}))
  failures.push(error);

// Generated extension customers plus shared derivations behind every built shift.
const seedIds = new Set(actLevels.flatMap((level) => (level.seeds ?? []).map((seed) => seed.id)));
for (const seed of extensionSeeds) {
  const levelNumber = Number(String(seed.id).slice(1));
  if (!Number.isInteger(levelNumber) || levelNumber < 1) {
    failures.push(`extension ${seed.id}: bad level number`);
    continue;
  }
  const tables = extensionActiveTables(levelNumber);
  if (!Number.isInteger(tables) || tables < 1 || tables > 16)
    failures.push(`extension ${seed.id}: derived active_tables ${tables} out of bounds`);
  const service = extensionServiceForLevel(levelNumber);
  if (!Number.isInteger(service.prepCapacity) || service.prepCapacity < 1)
    failures.push(`extension ${seed.id}: derived prepCapacity ${service.prepCapacity} invalid`);
  if (!Number.isInteger(service.floorCapacity) || service.floorCapacity < 1)
    failures.push(`extension ${seed.id}: derived floorCapacity ${service.floorCapacity} invalid`);
  if (!Number.isInteger(service.minLoad) || service.minLoad < 0)
    failures.push(`extension ${seed.id}: derived minLoad ${service.minLoad} invalid`);
  const act = extensionAct(levelNumber);
  if (!Number.isInteger(act) || act < 2 || act > 4) failures.push(`extension ${seed.id}: derived act ${act} invalid`);
  for (let s = 0; s < 3; s++) {
    const generated = extensionSeed(levelNumber, s);
    const expectedSeedId = `L${levelNumber}_${'ABC'[s]}`;
    if (generated.id !== expectedSeedId)
      failures.push(`extension ${seed.id}: generated seed ${generated.id} must equal ${expectedSeedId}`);
    if (seedIds.has(generated.id)) failures.push(`campaign: duplicate seed id ${generated.id}`);
    seedIds.add(generated.id);
    for (const error of collectSeedErrors(generated, `L${levelNumber}`))
      failures.push(`extension ${seed.id}: ${error}`);
  }
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
console.log(
  `validate:data ok: ${actLevels.length} act shifts (${(manifest.order ?? []).join(',')}) + ${extensionSeeds.length} extension shifts (${extensionSeeds.map((seed) => seed.id).join(',')}).`,
);
