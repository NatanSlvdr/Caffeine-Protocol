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
        statements: 55,
        branches: 50,
        functions: 50,
        lines: 55,
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
