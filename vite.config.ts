import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { createOfflineCafe } from './vite/plugins/offline-cafe';

/** Precache the complete static game, including the original soundtrack, for offline reloads. */
export default defineConfig({
  base: './',
  plugins: [react(), tsconfigPaths(), createOfflineCafe()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'tests/fixtures/**', 'node_modules/**'],
    setupFiles: ['./tests/setup.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/vite-env.d.ts'],
      thresholds: {
        // Global floors sit ~2% under the stable baseline
        // (77.99/75.23/70.96/78.81 stmts/branches/funcs/lines).
        statements: 76,
        branches: 73,
        functions: 69,
        lines: 77,
        // Stronger floors for critical paths (per-glob aggregates:
        // src/domain/** 90.69/85.83/96.48/93.22,
        // src/domain/simulation/** 94.40/86.46/100/99.02,
        // src/features/campaign/save/** 92.97/91.55/100/99.03).
        'src/domain/**': {
          statements: 88,
          branches: 83,
          functions: 94,
          lines: 91,
        },
        'src/domain/simulation/**': {
          statements: 92,
          branches: 84,
          functions: 95,
          lines: 97,
        },
        'src/features/campaign/save/**': {
          statements: 90,
          branches: 89,
          functions: 95,
          lines: 97,
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(three|three-stdlib|@react-three\/|react-reconciler|its-fine)/.test(id)) return 'cafe-3d';
        },
      },
    },
  },
});
