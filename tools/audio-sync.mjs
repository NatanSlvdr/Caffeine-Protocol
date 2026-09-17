/** Sync generated audio + icon from source-of-truth assets/ into served public/. */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`audio:sync ${from} -> ${to}`);
};

for (const file of readdirSync(join(root, 'assets/audio'))) {
  if (file.endsWith('.wav')) copy(join(root, 'assets/audio', file), join(root, 'public/audio', file));
}
copy(join(root, 'assets/icon.svg'), join(root, 'public/icon.svg'));
