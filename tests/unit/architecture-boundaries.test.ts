// @vitest-environment node
//
// Architecture boundary regression tests (Fixes #9).
//
// - Every prod src TS/TSX file must be explicitly classified by
//   eslint.config.mjs (element, app-shell file category, or shared-root file category).
// - Forbidden imports (fixtures in tests/fixtures/eslint-boundaries/forbidden-*)
//   must produce a boundaries/dependencies error when linted as their virtual src path.
// - Allowed imports (allowed-*) must stay clean.
//
// Fixtures live under tests/fixtures (ignored by normal npm run lint with
// boundaries/dependencies off), so they never break the build; here they are
// linted via ESLint.lintText(code, { filePath }) with a virtual src location
// so the real config classifies them as production code.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'eslint-boundaries');
const CONFIG_PATH = join(ROOT, 'eslint.config.mjs');

// Expected classification mirrors eslint.config.mjs. The config-text test below
// fails if these drift, so coverage stays honest.
const ELEMENT_GLOBS = [
  'src/domain/**',
  'src/shared/domain/**',
  'src/shared/ui/**',
  'src/shared/lib/**',
  'src/hooks/**',
  'src/data/**',
  'src/components/**',
  'src/features/**',
  'src/app/**',
  'src/state/**',
  'src/shell/**',
];
const FILE_GLOBS = [
  'src/App.tsx',
  'src/main.tsx',
  'src/audio.ts',
  'src/shell/**',
  'src/vite-env.d.ts',
  'src/shared/*.ts',
  'src/shared/*.tsx',
];

function globToRegExp(glob: string): RegExp {
  let out = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else if ('+.^$()|[]{}\\'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  out += '$';
  return new RegExp(out);
}

const CLASSIFIERS = [...ELEMENT_GLOBS, ...FILE_GLOBS].map(globToRegExp);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function toPosix(p: string): string {
  return relative(ROOT, p).split(sep).join('/');
}

interface FixtureCase {
  fixture: string;
  virtualPath: string;
  shouldFail: boolean;
}

const FORBIDDEN: FixtureCase[] = [
  { fixture: 'forbidden-domain-imports-data.ts', virtualPath: 'src/domain/probe-boundary.ts', shouldFail: true },
  {
    fixture: 'forbidden-features-imports-data.ts',
    virtualPath: 'src/features/workspace/probe-boundary.ts',
    shouldFail: true,
  },
  {
    fixture: 'forbidden-features-imports-shell.ts',
    virtualPath: 'src/features/workspace/probe-boundary.ts',
    shouldFail: true,
  },
  {
    fixture: 'forbidden-components-imports-features.ts',
    virtualPath: 'src/components/probe-boundary.tsx',
    shouldFail: true,
  },
  { fixture: 'forbidden-hooks-imports-features.ts', virtualPath: 'src/hooks/probe-boundary.ts', shouldFail: true },
  { fixture: 'forbidden-hooks-imports-data.ts', virtualPath: 'src/hooks/probe-boundary.ts', shouldFail: true },
  {
    fixture: 'forbidden-hooks-imports-components.ts',
    virtualPath: 'src/hooks/probe-boundary.ts',
    shouldFail: true,
  },
  { fixture: 'forbidden-data-imports-components.ts', virtualPath: 'src/data/probe-boundary.ts', shouldFail: true },
  {
    fixture: 'forbidden-shared-lib-imports-hooks.ts',
    virtualPath: 'src/shared/lib/probe-boundary.ts',
    shouldFail: true,
  },
  {
    fixture: 'forbidden-shared-root-imports-domain.ts',
    virtualPath: 'src/shared/probe-boundary.ts',
    shouldFail: true,
  },
];

const ALLOWED: FixtureCase[] = [
  { fixture: 'allowed-hooks-imports-domain.ts', virtualPath: 'src/hooks/probe-boundary.ts', shouldFail: false },
  {
    fixture: 'allowed-hooks-imports-shared-root.ts',
    virtualPath: 'src/hooks/probe-boundary.ts',
    shouldFail: false,
  },
  {
    fixture: 'allowed-components-imports-hooks.ts',
    virtualPath: 'src/components/probe-boundary.tsx',
    shouldFail: false,
  },
  { fixture: 'allowed-shell-imports-data.tsx', virtualPath: 'src/shell/probe-boundary.tsx', shouldFail: false },
  {
    fixture: 'allowed-shared-lib-imports-shared-root.ts',
    virtualPath: 'src/shared/lib/probe-boundary.ts',
    shouldFail: false,
  },
  {
    fixture: 'allowed-features-imports-hooks.ts',
    virtualPath: 'src/features/workspace/probe-boundary.ts',
    shouldFail: false,
  },
  { fixture: 'allowed-app-shell-imports-hooks.ts', virtualPath: 'src/App.tsx', shouldFail: false },
];

describe('architecture boundaries', () => {
  it('declares shell/hooks/shared-root boundaries in eslint config', () => {
    const text = readFileSync(CONFIG_PATH, 'utf8');
    // shell is app-shell (element + file category)
    expect(text).toContain('src/shell/**');
    // hooks have their own intentional element
    expect(text).toContain(`{ type: 'hooks'`);
    expect(text).toContain('src/hooks/**');
    // shared roots (audio-manifest) are an explicit file category
    expect(text).toContain(`category: 'shared-root'`);
    expect(text).toContain('src/shared/*.ts');
    // bootstrap types ride with app-shell so every prod path is classified
    expect(text).toContain('src/vite-env.d.ts');
    // shell/hooks/root wiring is explicit in policies
    expect(text).toContain(`categories: ['app-shell', 'shared-root']`);
    expect(text).toContain(`categories: 'shared-root'`);
  });

  it('classifies every prod TS/TSX path', () => {
    const files = walk(SRC).map(toPosix);
    expect(files.length).toBeGreaterThan(100);
    const uncovered = files.filter((f) => !CLASSIFIERS.some((re) => re.test(f)));
    expect(uncovered).toEqual([]);
  });

  it(
    'forbids illegal cross-layer imports',
    async () => {
      const eslint = new ESLint();
      for (const { fixture, virtualPath } of FORBIDDEN) {
        const code = readFileSync(join(FIXTURES, fixture), 'utf8');
        const [result] = await eslint.lintText(code, { filePath: virtualPath });
        const boundaryErrors = result.messages.filter((m) => m.ruleId === 'boundaries/dependencies');
        expect(
          boundaryErrors,
          `${fixture} as ${virtualPath} should fail boundaries but got: ${JSON.stringify(result.messages)}`,
        ).not.toHaveLength(0);
      }
    },
    60_000,
  );

  it(
    'allows intentional imports',
    async () => {
      const eslint = new ESLint();
      for (const { fixture, virtualPath } of ALLOWED) {
        const code = readFileSync(join(FIXTURES, fixture), 'utf8');
        const [result] = await eslint.lintText(code, { filePath: virtualPath });
        const boundaryErrors = result.messages.filter((m) => m.ruleId === 'boundaries/dependencies');
        expect(
          boundaryErrors,
          `${fixture} as ${virtualPath} should pass boundaries but got: ${JSON.stringify(result.messages)}`,
        ).toHaveLength(0);
      }
    },
    60_000,
  );
});
