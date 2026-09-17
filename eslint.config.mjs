import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

/**
 * Architecture boundaries (see docs/ARCHITECTURE.md):
 * - shared/domain never imports features/data/components (one-way: inward only)
 * - features/* only imports shared/*, sibling features, and leaf components (never data/app)
 * - components may import shared/domain + data (presentation reads registries)
 * - data may import shared/domain (type-only intent; enforced via consistent-type-imports)
 * - app shell (App/main/state/app) may import anything
 * Element globs cover both the current tree (src/domain, src/data, src/components)
 * and the target tree (src/shared/*, src/features/*) so the config holds during migration.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'tests/fixtures/**',
      'public/sw.js',
      '.cache/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
      'boundaries/elements': [
        { type: 'shared-domain', pattern: ['src/domain/**', 'src/shared/domain/**'] },
        { type: 'shared-ui', pattern: ['src/shared/ui/**'] },
        { type: 'shared-lib', pattern: ['src/shared/lib/**'] },
        { type: 'data', pattern: ['src/data/**'] },
        { type: 'components', pattern: ['src/components/**'] },
        { type: 'features', pattern: ['src/features/**'] },
        { type: 'app', pattern: ['src/app/**', 'src/state/**'] },
      ],
      'boundaries/files': [{ category: 'app-shell', pattern: ['src/App.tsx', 'src/main.tsx', 'src/audio.ts'] }],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // shared/domain is innermost: same-element only.
            { from: { element: { type: 'shared-domain' } }, allow: { to: { element: { type: 'shared-domain' } } } },
            // shared ui/lib primitives may read domain constants/types only.
            {
              from: { element: { type: 'shared-ui' } },
              allow: { to: { element: { types: { anyOf: ['shared-ui', 'shared-domain'] } } } },
            },
            {
              from: { element: { type: 'shared-lib' } },
              allow: { to: { element: { types: { anyOf: ['shared-lib', 'shared-domain'] } } } },
            },
            // data merges campaign sources; may read shared/domain (prefer `import type`).
            {
              from: { element: { type: 'data' } },
              allow: { to: { element: { types: { anyOf: ['data', 'shared-domain'] } } } },
            },
            // components are presentation: domain + data + shared.
            {
              from: { element: { type: 'components' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['components', 'data', 'shared-domain', 'shared-ui', 'shared-lib'] } },
                },
              },
            },
            // features own behavior: shared/* + sibling features + leaf components.
            // Never data (inject via props/store) or app shell (no upward imports).
            {
              from: { element: { type: 'features' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['features', 'components', 'shared-domain', 'shared-ui', 'shared-lib'] } },
                },
              },
            },
            // app shell (App/main/state/app + classified shell files) may wire anything.
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['app', 'features', 'components', 'data', 'shared-domain', 'shared-ui', 'shared-lib'],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: { to: { file: { categories: 'app-shell' } } },
            },
            {
              from: { file: { categories: 'app-shell' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['app', 'features', 'components', 'data', 'shared-domain', 'shared-ui', 'shared-lib'],
                    },
                  },
                },
              },
            },
            {
              from: { file: { categories: 'app-shell' } },
              allow: { to: { file: { categories: 'app-shell' } } },
            },
          ],
        },
      ],
      'import/no-cycle': ['error', { maxDepth: Infinity }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/components/**', 'src/features/**', 'src/app/**', 'src/state/**', 'src/App.tsx', 'src/audio.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../domain', '../domain/*', './domain', './domain/*'],
              message: 'Import from @/domain (barrel) instead of relative domain paths.',
            },
            {
              group: ['../data', '../data/*', './data', './data/*'],
              message: 'Import from @/data instead of relative data paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/App.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./components', './components/*'],
              message: 'Import from @/components (barrel) instead of relative component paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**', 'playwright.config.ts', 'vite.config.ts', 'vite/plugins/**', 'tools/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'boundaries/dependencies': 'off',
    },
  },
);
