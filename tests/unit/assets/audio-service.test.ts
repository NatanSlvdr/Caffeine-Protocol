import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService, MOODS, MOOD_GLIDE, MUSIC_DELAY, MUSIC_FADE_IN } from '../../../src/shared/lib/audio';
import type { Settings } from '../../../src/domain';

const settings: Settings = {
  music: 0.4,
  reduced_motion: false,
  pixel_art: true,
  text_editor: false,
  speed: 1,
  first_routine_tips: true,
  short_repeats: false,
  block_preview: false,
  service_summary: false,
  dialogue_pace: 'typed',
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

class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}

class FakeContext {
  static last?: FakeContext;
  currentTime = 10;
  readonly destination = new FakeNode();
  readonly gains: FakeNode[] = [];
  readonly sources: FakeNode[] = [];
  readonly filters: FakeFilter[] = [];
  suspended = false;
  constructor() {
    FakeContext.last = this;
  }
  createGain() {
    const node = new FakeNode();
    this.gains.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = new FakeFilter();
    this.filters.push(node);
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
    expect(ctx.gains).toHaveLength(3);
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

  describe('the mood the music is heard in', () => {
    /** The voicing as heard now: the band the filters pass and the mood's level. */
    const voicing = (ctx: FakeContext) => {
      const [low, high] = ctx.filters;
      const [, , level] = ctx.gains;
      return { low: low.frequency.value, high: high.frequency.value, level: level.gain.value };
    };

    it('plays the loop untouched in the café, through filters flat to their cutoffs', async () => {
      const audio = new AudioService();
      audio.configure(settings);
      audio.start();
      await flush();
      const ctx = FakeContext.last!;
      expect(ctx.filters.map((f) => [f.type, f.Q.value])).toEqual([
        ['highpass', -3.01],
        ['lowpass', -3.01],
      ]);
      expect(audio.mood).toBe('cafe');
      expect(voicing(ctx)).toEqual(MOODS.cafe);
      // The source goes through the slider, the band and the mood's level before the fades.
      const [fade, music, level] = ctx.gains;
      expect(ctx.sources[0].outputs).toEqual([music]);
      expect(music.outputs).toEqual([ctx.filters[0]]);
      expect(ctx.filters[0].outputs).toEqual([ctx.filters[1]]);
      expect(ctx.filters[1].outputs).toEqual([level]);
      expect(level.outputs).toEqual([fade]);
    });

    it('starts in the mood already asked for, without a glide', async () => {
      const audio = new AudioService();
      audio.configure(settings);
      audio.hold('memory');
      audio.start();
      await flush();
      const ctx = FakeContext.last!;
      expect(voicing(ctx)).toEqual(MOODS.memory);
      expect(ctx.filters[1].frequency.calls).toEqual([]);
    });

    it('glides into a mood asked for, and back to the one before once it is let go', async () => {
      const audio = new AudioService();
      audio.configure(settings);
      audio.start();
      await flush();
      const ctx = FakeContext.last!;
      const memory = audio.hold('memory');
      const bay = audio.hold('after-hours');
      expect(audio.mood).toBe('after-hours');
      expect(voicing(ctx)).toEqual(MOODS['after-hours']);
      expect(ctx.filters[1].frequency.calls.at(-1)).toEqual(['target', MOODS['after-hours'].high, 10]);
      memory();
      expect(audio.mood).toBe('after-hours');
      bay();
      bay();
      expect(audio.mood).toBe('cafe');
      expect(voicing(ctx)).toEqual(MOODS.cafe);
      expect(MOOD_GLIDE).toBeGreaterThanOrEqual(1);
    });

    it('keeps every mood in the loop’s range: a band that passes something, at a level no louder than the café', () => {
      for (const { low, high, level } of Object.values(MOODS)) {
        expect(low).toBeLessThan(high);
        expect(level).toBeGreaterThan(0);
        expect(level).toBeLessThanOrEqual(MOODS.cafe.level);
      }
    });
  });
});
