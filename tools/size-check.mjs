/**
 * The production build's weight, held to the budgets in docs/PERFORMANCE.md. `npm run build` ends with it, so a
 * build that grows past a budget fails where it was made, not on a slow tablet's first visit.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const KIB = 1024;
export const BUDGETS = {
  /** The scripts and styles index.html loads or preloads before the café can draw, gzipped as a server sends them. */
  startup: 540 * KIB,
  /** Everything in the build, which the offline worker stores on the first visit. */
  total: 16 * KIB * KIB,
};

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
const size = (bytes) =>
  bytes >= KIB * KIB ? `${(bytes / KIB / KIB).toFixed(1)} MiB` : `${Math.round(bytes / KIB)} KiB`;

/** What a build weighs: the files the page needs before it can draw, their gzipped size, and the whole build. */
export function payload(dist) {
  const page = readFileSync(join(dist, 'index.html'), 'utf8');
  const startupFiles = [...new Set([...page.matchAll(/(?:src|href)="\.?\/?([^"]+\.(?:js|css))"/g)].map(([, f]) => f))];
  return {
    startupFiles,
    startup: startupFiles.reduce((sum, file) => sum + gzipSync(readFileSync(join(dist, file)), { level: 9 }).length, 0),
    total: files(dist).reduce((sum, file) => sum + statSync(file).size, 0),
  };
}

/** Every budget the build in `dist` is over; empty when it fits. */
export function payloadErrors(dist, budgets = BUDGETS) {
  const { startupFiles, startup, total } = payload(dist);
  const errors = [];
  if (!startupFiles.length) errors.push(`${dist}/index.html loads no scripts or styles`);
  if (startup > budgets.startup)
    errors.push(`startup scripts and styles weigh ${size(startup)} gzipped, over the ${size(budgets.startup)} budget`);
  if (total > budgets.total) errors.push(`the build weighs ${size(total)}, over the ${size(budgets.total)} budget`);
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? 'dist';
  const errors = payloadErrors(dist);
  const { startup, total } = payload(dist);
  for (const error of errors) console.error(`size-check: ${error}`);
  if (errors.length) process.exit(1);
  console.log(`size-check ok: startup ${size(startup)} gzipped, build ${size(total)}.`);
}
