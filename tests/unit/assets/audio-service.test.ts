import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService, MUSIC_DELAY, MUSIC_FADE_IN } from '../../../src/shared/lib/audio';
import type { Settings } from '../../../src/domain';

const settings: Settings = {
  music: 0.4,
  reduced_motion: false,
  pixel_art: true,
  text_editor: false,
  speed: 1,
  first_routine_tips: true,
  short_repeats: false,
};

class FakeParam {
  value = 1;
  readonly calls: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.calls.push(['set', v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push(['ramp', v, t]);
  }
  setTargetAtTime(v: number, t: number) {
    this.calls.push(['target', v, t]);
    this.value = v;
  }
  cancelScheduledValues(t: number) {
    this.calls.push(['cancel', 0, t]);
  }
}

class FakeNode {
  readonly gain = new FakeParam();
  readonly playbackRate = new FakeParam();
  buffer?: { name: string };
  loop = false;
  started?: number;
  readonly outputs: FakeNode[] = [];
  connect(node: FakeNode) {
    this.outputs.push(node);
  }
  start(at = 0) {
    this.started = at;
  }
}

class FakeContext {
  static last?: FakeContext;
  currentTime = 10;
  readonly destination = new FakeNode();
  readonly gains: FakeNode[] = [];
  readonly sources: FakeNode[] = [];
  suspended = false;
  constructor() {
    FakeContext.last = this;
  }
  createGain() {
    const node = new FakeNode();
    this.gains.push(node);
    return node;
  }
  createBufferSource() {
    const node = new FakeNode();
    this.sources.push(node);
    return node;
  }
  decodeAudioData(data: ArrayBuffer) {
    return Promise.resolve({ name: new TextDecoder().decode(data) });
  }
  resume() {
    this.suspended = false;
    return Promise.resolve();
  }
  suspend() {
    this.suspended = true;
    return Promise.resolve();
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AudioService', () => {
  beforeEach(() => {
    FakeContext.last = undefined;
    vi.stubGlobal('AudioContext', FakeContext);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(url).buffer) }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stays silent until configured and started by a gesture', () => {
    const audio = new AudioService();
    audio.start();
    expect(FakeContext.last).toBeUndefined();
  });

  it('starts the music alone after a pause and fades it in slowly', async () => {
    const audio = new AudioService();
    audio.configure(settings);
    audio.start();
    await flush();
    const ctx = FakeContext.last!;
    expect(ctx.sources.map((s) => [s.buffer?.name, s.loop, s.started])).toEqual([
      ['/audio/cafe_loop.wav', true, 10 + MUSIC_DELAY],
    ]);
    const fade = ctx.gains.find((g) => g.gain.calls.some(([kind]) => kind === 'ramp'))!;
    expect(fade.gain.calls).toEqual([
      ['set', 0, 10 + MUSIC_DELAY],
      ['ramp', 1, 10 + MUSIC_DELAY + MUSIC_FADE_IN],
    ]);
  });

  it('follows the music slider', async () => {
    const audio = new AudioService();
    audio.configure(settings);
    audio.start();
    await flush();
    const ctx = FakeContext.last!;
    expect(ctx.gains).toHaveLength(2);
    const [, music] = ctx.gains;
    expect(music.gain.value).toBe(0.4);
    audio.configure({ ...settings, music: 0 });
    expect(music.gain.value).toBe(0);
  });

  it('suspends while the tab is hidden and eases back in', async () => {
    const audio = new AudioService();
    audio.configure(settings);
    audio.start();
    await flush();
    const ctx = FakeContext.last!;
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.suspended).toBe(true);
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.suspended).toBe(false);
    const [fade] = ctx.gains;
    expect(fade.gain.calls.at(-1)?.[0]).toBe('ramp');
    hidden.mockRestore();
  });
});
