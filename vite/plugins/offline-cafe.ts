import type { Plugin } from 'vite';
import { SOUNDS } from '../../src/shared/audio-manifest';

/** Precache the complete static game, including the original soundtrack, for offline reloads. */
export function createOfflineCafe({ audio = SOUNDS }: { audio?: readonly string[] } = {}): Plugin {
  return {
    name: 'offline-cafe',
    generateBundle(_, bundle) {
      const files = [
        './',
        './index.html',
        './icon.svg',
        ...Object.keys(bundle).map((f) => './' + f),
        ...audio.map((f) => `./audio/${f}.wav`),
      ];
      const version = Object.keys(bundle)
        .join('-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .slice(-180);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const prefix='caffeine-'+encodeURIComponent(self.registration.scope)+'-';const name=prefix+${JSON.stringify(version)};const files=${JSON.stringify(files)};self.addEventListener('install',event=>event.waitUntil(caches.open(name).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==name).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));});`,
      });
    },
  };
}
