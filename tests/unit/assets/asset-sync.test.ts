import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOUNDS } from '../../../src/shared/audio-manifest';

/**
 * Regression test for asset source-of-truth sync (ADR 003):
 * served copies in public/ must be byte-identical to assets/, and both
 * `audio:sync --check` and `validate:data` must fail loudly on divergence
 * so `npm run build` can never silently ship stale assets.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const sha256 = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

function runTool(script: string, args: string[] = []): { ok: boolean; output: string } {
  try {
    const stdout = execFileSync('node', [join(root, script), ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }) as string;
    return { ok: true, output: stdout };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

/** Back up a served file, append one byte to diverge it, run fn, then restore. */
function withDivergedServedCopy(relativePath: string, fn: () => void): void {
  const target = join(root, relativePath);
  const backup = `${target}.bak-asset-sync-test`;
  copyFileSync(target, backup);
  try {
    appendFileSync(target, Buffer.from([0x00]));
    expect(sha256(target)).not.toBe(sha256(backup));
    fn();
  } finally {
    copyFileSync(backup, target);
    rmSync(backup, { force: true });
  }
}

describe('asset source-of-truth sync (ADR 003)', () => {
  it('uses the manifest as the sound-ID source with source + served copies present', () => {
    expect(SOUNDS.length).toBeGreaterThan(0);
    for (const sound of SOUNDS) {
      expect(existsSync(join(root, `assets/audio/${sound}.wav`)), `missing source assets/audio/${sound}.wav`).toBe(
        true,
      );
      expect(existsSync(join(root, `public/audio/${sound}.wav`)), `missing served public/audio/${sound}.wav`).toBe(
        true,
      );
    }
  });

  it('ships served copies byte-identical to the sources (every sound + icon)', () => {
    for (const sound of SOUNDS) {
      expect(sha256(join(root, `public/audio/${sound}.wav`))).toBe(sha256(join(root, `assets/audio/${sound}.wav`)));
    }
    expect(sha256(join(root, 'public/icon.svg'))).toBe(sha256(join(root, 'assets/icon.svg')));
  });

  it('audio:sync --check passes on a clean tree', () => {
    const result = runTool('tools/audio-sync.mjs', ['--check']);
    expect(`${result.output} (ok=${result.ok})`).toContain('ok');
    expect(result.ok).toBe(true);
  });

  it('audio:sync --check detects a divergent served sound', () => {
    withDivergedServedCopy('public/audio/serve.wav', () => {
      const result = runTool('tools/audio-sync.mjs', ['--check']);
      expect(result.ok).toBe(false);
      expect(result.output).toContain('serve.wav');
      expect(result.output).toContain('audio:sync');
    });
  });

  it('validate:data detects a divergent served icon', () => {
    withDivergedServedCopy('public/icon.svg', () => {
      const result = runTool('tools/validate-data.mjs');
      expect(result.ok).toBe(false);
      expect(result.output).toContain('icon.svg');
      expect(result.output).toContain('audio:sync');
    });
  });

  it('validate:data detects a divergent served sound', () => {
    withDivergedServedCopy('public/audio/click.wav', () => {
      const result = runTool('tools/validate-data.mjs');
      expect(result.ok).toBe(false);
      expect(result.output).toContain('click.wav');
    });
  });
});
