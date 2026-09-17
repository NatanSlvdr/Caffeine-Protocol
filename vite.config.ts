import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/** Precache the complete static game, including the original soundtrack, for offline reloads. */
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tsconfigPaths(),
    {
      name: 'offline-cafe',
      generateBundle(_, bundle) {
        const files = [
          './',
          './index.html',
          './icon.svg',
          ...Object.keys(bundle).map((f) => './' + f),
          ...['click', 'morning_loop', 'retry', 'serve', 'success'].map((f) => `./audio/${f}.wav`),
        ];
        const version = Object.keys(bundle)
          .join('-')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .slice(-180);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const prefix='caffeine-'+encodeURIComponent(self.registration.scope)+'-';const name=prefix+${JSON.stringify(version)};const files=${JSON.stringify(files)};self.addEventListener('install',event=>event.waitUntil(caches.open(name).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==name).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));});`,
        });
      },
    },
  ],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
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
          if (id.includes('three') || id.includes('react-reconciler') || id.includes('its-fine')) return 'cafe-3d';
        },
      },
    },
  },
});
