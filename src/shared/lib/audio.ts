import type { Settings } from '@/domain';
import type { SoundName } from '@/shared/audio-manifest';

export type { SoundName };

/** Served audio file for a sound id, honoring the static base path. */
export function audioUrl(name: string): string {
  return `${import.meta.env.BASE_URL}audio/${name}.wav`;
}

/** Background loops; everything else in the manifest is a one-shot effect. */
const MUSIC: SoundName = 'cafe_loop';
const ROOM: SoundName = 'cafe_room';
/** The room tone sits under the music and follows the music slider. */
const ROOM_LEVEL = 0.45;
/** Silence before the music starts, then a slow swell, so it never jumps out at launch. */
export const MUSIC_DELAY = 2.5;
export const MUSIC_FADE_IN = 9;
const RESUME_FADE = 1.5;
const VOLUME_SMOOTHING = 0.08;
/** Repeats of one effect closer than this are dropped (a double click stays one tock). */
const REPEAT_GAP = 0.04;

type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  const scope = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

/**
 * Web Audio mixer: a looping café track and room tone that fade in after the first
 * gesture, plus soft one-shots with a touch of pitch variation so repeats don't grate.
 * Browsers without Web Audio stay silent.
 */
export class AudioService {
  private settings?: Settings;
  private ctx?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private room?: GainNode;
  private effects?: GainNode;
  /** Fades the loops in and out (launch, tab hidden) independently of the sliders. */
  private loopFade?: GainNode;
  private readonly buffers = new Map<SoundName, Promise<AudioBuffer | undefined>>();
  private readonly lastPlayed = new Map<SoundName, number>();
  private started = false;

  constructor(private readonly random: () => number = Math.random) {}

  configure(next: Settings): void {
    this.settings = next;
    this.applyVolumes();
  }

  start(): void {
    if (this.started || !this.settings) return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    this.started = true;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.loopFade = ctx.createGain();
    this.loopFade.gain.value = 0;
    this.loopFade.connect(this.master);
    this.music = ctx.createGain();
    this.music.connect(this.loopFade);
    this.room = ctx.createGain();
    this.room.connect(this.loopFade);
    this.effects = ctx.createGain();
    this.effects.connect(this.master);
    this.applyVolumes(true);
    void ctx.resume?.();
    void this.startLoops();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  play(name: SoundName): void {
    const { ctx, effects } = this;
    if (!ctx || !effects) return;
    const last = this.lastPlayed.get(name);
    if (last !== undefined && ctx.currentTime - last < REPEAT_GAP) return;
    this.lastPlayed.set(name, ctx.currentTime);
    void this.load(name).then((buffer) => {
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 0.96 + this.random() * 0.08;
      const gain = ctx.createGain();
      gain.gain.value = 0.85 + this.random() * 0.15;
      source.connect(gain);
      gain.connect(effects);
      source.start();
    });
  }

  private async startLoops(): Promise<void> {
    const [music, room] = await Promise.all([this.load(MUSIC), this.load(ROOM)]);
    const { ctx, loopFade } = this;
    if (!ctx || !loopFade) return;
    const begin = ctx.currentTime + MUSIC_DELAY;
    for (const [buffer, bus] of [
      [music, this.music],
      [room, this.room],
    ] as const) {
      if (!buffer || !bus) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(bus);
      source.start(begin);
    }
    loopFade.gain.setValueAtTime(0, begin);
    loopFade.gain.linearRampToValueAtTime(1, begin + MUSIC_FADE_IN);
  }

  private load(name: SoundName): Promise<AudioBuffer | undefined> {
    let pending = this.buffers.get(name);
    if (!pending) {
      const ctx = this.ctx;
      pending = (async () => {
        try {
          const response = await fetch(audioUrl(name));
          if (!ctx || !response.ok) return undefined;
          return await ctx.decodeAudioData(await response.arrayBuffer());
        } catch {
          return undefined;
        }
      })();
      this.buffers.set(name, pending);
    }
    return pending;
  }

  private applyVolumes(immediate = false): void {
    const { ctx, settings } = this;
    if (!ctx || !settings) return;
    const set = (node: GainNode | undefined, value: number) => {
      if (!node) return;
      if (immediate) node.gain.value = value;
      else node.gain.setTargetAtTime(value, ctx.currentTime, VOLUME_SMOOTHING);
    };
    set(this.master, settings.volume);
    set(this.music, settings.music);
    set(this.room, settings.music * ROOM_LEVEL);
    set(this.effects, settings.effects);
  }

  /** Hush the café while the tab is hidden; ease back in when it returns. */
  private readonly onVisibility = (): void => {
    const { ctx, loopFade } = this;
    if (!ctx || !loopFade) return;
    if (document.hidden) {
      void ctx.suspend?.();
    } else {
      const now = ctx.currentTime;
      loopFade.gain.cancelScheduledValues(now);
      loopFade.gain.setValueAtTime(0, now);
      loopFade.gain.linearRampToValueAtTime(1, now + RESUME_FADE);
      void ctx.resume?.();
    }
  };
}

export const audioService = new AudioService();
export const configureAudio = (next: Settings): void => audioService.configure(next);
export const startAudio = (): void => audioService.start();
export const playSound = (name: SoundName): void => audioService.play(name);
