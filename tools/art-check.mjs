/**
 * The art the game ships, checked against its sources and the frames the game puts it in. `tools/cutscenes.py` and
 * `tools/portraits.py` turn assets/<kind>/<folder>/<name>.png into src/assets/<kind>/<folder>/<name>.webp; a run that
 * succeeded is no proof the result is there, current, or the shape the game expects, or that it isn't another
 * picture saved over again. Sync conflict copies ("01 2.webp") are skipped, as the game skips them.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const KINDS = {
  /** 16:9 prints dropped on the table; the tool crops every source to fill them. */
  cutscenes: { width: 1920, height: 1080, alpha: false, source: /\.(png|jpe?g)$/i, tool: 'tools/cutscenes.py' },
  /** Busts standing on the dialogue box, cut out on a transparent canvas. */
  portraits: { width: 768, height: 1024, alpha: true, source: /\.png$/i, tool: 'tools/portraits.py' },
};

const conflictCopy = /\s\d+\.[a-z]+$/i;
const list = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((name) => !name.startsWith('.') && !conflictCopy.test(name)) : [];
const stem = (name) => name.replace(/\.[a-z]+$/i, '');

/** A WebP's canvas size, and whether it can be see-through. Throws on anything that isn't a WebP. */
export function webpInfo(bytes) {
  if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP')
    throw new Error('not a WebP');
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X')
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3), alpha: !!(bytes[20] & 0x10) };
  if (chunk === 'VP8 ')
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff, alpha: false };
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alpha: !!((bits >>> 28) & 1) };
  }
  throw new Error(`not a WebP: unknown chunk ${JSON.stringify(chunk)}`);
}

/** Every way the shipped art under `root` has drifted from its sources or its frame; empty when it hasn't. */
export function artErrors(root) {
  const errors = [];
  for (const [kind, frame] of Object.entries(KINDS)) {
    /** The first file shipped with each image, so a copy of one shown somewhere else is caught. */
    const firstWith = new Map();
    const shippedDir = join(root, 'src/assets', kind),
      sourceDir = join(root, 'assets', kind);
    const folders = [...new Set([...list(shippedDir), ...list(sourceDir)])].sort();
    for (const folder of folders) {
      const shipped = list(join(shippedDir, folder)).filter((name) => name.endsWith('.webp')),
        sources = list(join(sourceDir, folder)).filter((name) => frame.source.test(name));
      const shippedStems = new Set(shipped.map(stem)),
        sourceStems = new Set(sources.map(stem));
      for (const name of sources)
        if (!shippedStems.has(stem(name)))
          errors.push(`assets/${kind}/${folder}/${name} isn’t converted (run python3 ${frame.tool})`);
      for (const name of shipped) {
        const path = `src/assets/${kind}/${folder}/${name}`;
        if (!sourceStems.has(stem(name))) errors.push(`${path} has no source in assets/${kind}/${folder}`);
        const bytes = readFileSync(join(shippedDir, folder, name));
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (firstWith.has(hash)) errors.push(`${path} is the same image as ${firstWith.get(hash)}`);
        else firstWith.set(hash, path);
        let info;
        try {
          info = webpInfo(bytes);
        } catch (error) {
          errors.push(`${path}: ${error.message}`);
          continue;
        }
        if (info.width !== frame.width || info.height !== frame.height)
          errors.push(`${path} is ${info.width} × ${info.height}, not ${frame.width} × ${frame.height}`);
        if (info.alpha !== frame.alpha)
          errors.push(`${path} ${frame.alpha ? 'has no transparency' : 'has transparency it shouldn’t'}`);
      }
      // Panels play in number order from 01, so a gap would show the wrong still from there on.
      if (kind === 'cutscenes')
        [...shippedStems].sort().forEach((name, index) => {
          const wanted = String(index + 1).padStart(2, '0');
          if (name !== wanted)
            errors.push(`src/assets/cutscenes/${folder}/${name}.webp is out of order: expected ${wanted}`);
        });
      // Every other mood falls back to neutral, so it can't be missing.
      if (kind === 'portraits' && shipped.length && !shippedStems.has('neutral'))
        errors.push(`src/assets/portraits/${folder} has no neutral.webp`);
    }
  }
  return errors;
}
