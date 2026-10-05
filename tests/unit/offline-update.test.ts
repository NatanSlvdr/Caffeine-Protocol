// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { buildServiceWorkerSource } from '../../vite/plugins/offline-cafe';
import { UPDATE_MESSAGE } from '../../src/shared/offline-manifest';

const SCOPE = 'https://cafe.test/';
const url = (request: string | { url: string }) =>
  new URL(typeof request === 'string' ? request : request.url, SCOPE).href;

/** A browser for the café's service worker: its caches, in the order they were made, and a server to fill them. */
function browser() {
  const stores = new Map<string, Map<string, Response>>();
  const server = { online: true, files: new Map<string, string>() };
  const fetch = async (request: string | { url: string }) => {
    const body = server.files.get(url(request));
    if (!server.online || body === undefined) throw new TypeError('Failed to fetch');
    return new Response(body);
  };
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async addAll(requests: string[]) {
          const responses = await Promise.all(requests.map(fetch));
          requests.forEach((request, index) => store.set(url(request), responses[index]));
        },
        match: async (request: string | { url: string }) => store.get(url(request))?.clone(),
        put: async (request: string, response: Response) => void store.set(url(request), response),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    async match(request: string | { url: string }) {
      for (const store of stores.values()) if (store.has(url(request))) return store.get(url(request))!.clone();
    },
  };
  /** Publish a build: its files on the server, and a worker for it. */
  const publish = (version: string, contents: Record<string, string>) => {
    for (const [path, body] of Object.entries(contents)) server.files.set(url(path), body);
    server.files.set(url('./'), contents['./index.html']);
    const handlers: Record<string, (event: object) => void> = {};
    const self = {
      registration: { scope: SCOPE },
      location: new URL('sw.js', SCOPE),
      addEventListener: (type: string, handler: (event: object) => void) => (handlers[type] = handler),
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn(async () => {}) },
    };
    new Function(
      'self',
      'caches',
      'fetch',
      'Response',
      buildServiceWorkerSource(version, ['./', ...Object.keys(contents)]),
    )(self, caches, fetch, Response);
    const lifecycle = (type: string) => {
      let done: unknown;
      handlers[type]({ waitUntil: (promise: unknown) => (done = promise) });
      return done;
    };
    return {
      self,
      install: () => lifecycle('install'),
      activate: () => lifecycle('activate'),
      message: (data: unknown) => handlers.message({ data }),
      /** What a tab gets for a request this worker answers, as text; null for a network error. */
      async get(path: string, mode = 'no-cors') {
        let answer: Promise<Response> | undefined;
        handlers.fetch({
          request: { method: 'GET', url: url(path), mode },
          respondWith: (p: Promise<Response>) => (answer = p),
        });
        const response = await answer!;
        return response.type === 'error' ? null : response.text();
      },
    };
  };
  const names = () => [...stores.keys()].map((name) => name.slice(`caffeine-${encodeURIComponent(SCOPE)}-`.length));
  return { server, publish, names };
}

const build = (tag: string) => ({ './index.html': `<html>${tag}</html>`, './assets/app.js': `app ${tag}` });

describe('a new build of the café, offline', () => {
  it('installs alongside the build in use and waits, rather than taking over mid-session', async () => {
    const { publish, names } = browser();
    const a = publish('a', build('A'));
    await a.install();
    await a.activate();
    const b = publish('b', build('B'));
    await b.install();
    expect(b.self.skipWaiting).not.toHaveBeenCalled();
    expect(names()).toEqual(['a', 'meta', 'b']);
    // The tab on build A still gets build A.
    expect(await a.get('./index.html')).toBe('<html>A</html>');
  });

  it('takes over when a tab asks for it, and for nothing else', async () => {
    const { publish } = browser();
    const b = publish('b', build('B'));
    b.message('hello');
    b.message({ type: 'SKIP_WAITING' });
    expect(b.self.skipWaiting).not.toHaveBeenCalled();
    b.message(UPDATE_MESSAGE);
    expect(b.self.skipWaiting).toHaveBeenCalledOnce();
  });

  it('drops what a failed install cached, so a half-filled cache never stands in for a build', async () => {
    const { server, publish, names } = browser();
    const a = publish('a', build('A'));
    await a.install();
    await a.activate();
    const b = publish('b', build('B'));
    server.files.delete(url('./assets/app.js'));
    await expect(b.install()).rejects.toThrow('Failed to fetch');
    expect(names()).toEqual(['a', 'meta']);
  });

  it('keeps the build it replaced for tabs still running it, and deletes anything older', async () => {
    const { server, publish, names } = browser();
    const a = publish('a', { ...build('A'), './assets/scene-a.webp': 'scene A' });
    await a.install();
    await a.activate();
    const b = publish('b', build('B'));
    await b.install();
    await b.activate();
    expect(b.self.clients.claim).toHaveBeenCalled();
    expect(names()).toEqual(['a', 'meta', 'b']);
    // A tab opened on build A reaches a scene only build A had, offline, after build B took over.
    server.online = false;
    expect(await b.get('./assets/scene-a.webp')).toBe('scene A');
    server.online = true;
    const c = publish('c', build('C'));
    await c.install();
    await c.activate();
    expect(names()).toEqual(['meta', 'b', 'c']);
    server.online = false;
    expect(await c.get('./assets/scene-a.webp')).toBeNull();
  });

  it('answers from the current build first, then the network, and offline pages with its own index', async () => {
    const { server, publish } = browser();
    const a = publish('a', build('A'));
    await a.install();
    await a.activate();
    const b = publish('b', build('B'));
    await b.install();
    await b.activate();
    expect(await b.get('./assets/app.js')).toBe('app B');
    expect(await b.get('./')).toBe('<html>B</html>');
    server.files.set(url('./assets/fresh.js'), 'fresh');
    expect(await b.get('./assets/fresh.js')).toBe('fresh');
    server.online = false;
    expect(await b.get('./shift/4', 'navigate')).toBe('<html>B</html>');
    expect(await b.get('./missing.js')).toBeNull();
  });
});
