import type { Settings } from '@/domain';
import type { SoundName } from '@/shared/audio-manifest';

export type { SoundName };

/** Served audio file for a sound id, honoring the static base path. */
export function audioUrl(name: string): string {
  return `${import.meta.env.BASE_URL}audio/${name}.wav`;
}

/** The café soundtrack is the game's only sound: no room tone, no UI or service effects. */
const MUSIC: SoundName = 'cafe_loop';
/** Silence before the music starts, then a slow swell, so it never jumps out at launch. */
export const MUSIC_DELAY = 2.5;
export const MUSIC_FADE_IN = 9;
const RESUME_FADE = 1.5;
const VOLUME_SMOOTHING = 0.08;

/**
 * Where the music is heard from. One loop, voiced for the place rather than recorded again: a second recording would
 * cost the build as much again as the whole loop. `cafe` is the loop as recorded; `memory` is an old record, thin at
 * both ends, for a morning from Lou's café; `after-hours` is the café heard from the next room, darker and softer, in
 * the repair bay and at closing time.
 */
export type MusicMood = 'cafe' | 'memory' | 'after-hours';
/** Each mood's band (Hz) and level. The café's band is wider than the loop, so the filters leave it untouched. */
export const MOODS: Record<MusicMood, { low: number; high: number; level: number }> = {
  cafe: { low: 20, high: 20000, level: 1 },
  memory: { low: 320, high: 2600, level: 0.85 },
  'after-hours': { low: 20, high: 900, level: 0.7 },
};
/** A filter's resonance in decibels for a Butterworth response: flat up to the cutoff, with no peak at it. */
const FLAT = -3.01;
/** How slowly one mood eases into the next: about four times this, in seconds, to settle. */
export const MOOD_GLIDE = 1.2;

type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  const scope = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

/**
 * Web Audio player for the looping café track, which fades in after the first
 * gesture. Browsers without Web Audio stay silent.
 */
export class AudioService {
  private settings?: Settings;
  private ctx?: AudioContext;
  private music?: GainNode;
  /** Fades the music in and out (launch, tab hidden) independently of the sliders. */
  private loopFade?: GainNode;
  private voicing?: { low: BiquadFilterNode; high: BiquadFilterNode; level: GainNode };
  /** The moods asked for, the latest last: it is the one heard, and letting it go returns to the one before. */
  private readonly holds: { mood: MusicMood }[] = [];
  private started = false;

  configure(next: Settings): void {
    this.settings = next;
    this.applyVolume();
  }

  start(): void {
    if (this.started || !this.settings) return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    this.started = true;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.loopFade = ctx.createGain();
    this.loopFade.gain.value = 0;
    this.loopFade.connect(ctx.destination);
    // The slider, then the mood's voicing, then the fades.
    this.music = ctx.createGain();
    const low = ctx.createBiquadFilter();
    low.type = 'highpass';
    const high = ctx.createBiquadFilter();
    high.type = 'lowpass';
    for (const filter of [low, high]) filter.Q.value = FLAT;
    const level = ctx.createGain();
    this.music.connect(low);
    low.connect(high);
    high.connect(level);
    level.connect(this.loopFade);
    this.voicing = { low, high, level };
    this.applyVolume(true);
    this.applyMood(true);
    void ctx.resume?.();
    void this.startMusic();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private async startMusic(): Promise<void> {
    const buffer = await this.load(MUSIC);
    const { ctx, loopFade, music } = this;
    if (!ctx || !loopFade || !music || !buffer) return;
    const begin = ctx.currentTime + MUSIC_DELAY;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(music);
    source.start(begin);
    loopFade.gain.setValueAtTime(0, begin);
    loopFade.gain.linearRampToValueAtTime(1, begin + MUSIC_FADE_IN);
  }

  /** Asks for a mood until the returned release is called; the latest mood asked for is the one heard. */
  hold(mood: MusicMood): () => void {
    const hold = { mood };
    this.holds.push(hold);
    this.applyMood();
    return () => {
      const at = this.holds.indexOf(hold);
      if (at < 0) return;
      this.holds.splice(at, 1);
      this.applyMood();
    };
  }

  /** The mood heard now. */
  get mood(): MusicMood {
    return this.holds.at(-1)?.mood ?? 'cafe';
  }

  private applyMood(immediate = false): void {
    const { ctx, voicing } = this;
    if (!ctx || !voicing) return;
    const { low, high, level } = MOODS[this.mood];
    const glide = (param: AudioParam, value: number) => {
      if (immediate) param.value = value;
      else param.setTargetAtTime(value, ctx.currentTime, MOOD_GLIDE);
    };
    glide(voicing.low.frequency, low);
    glide(voicing.high.frequency, high);
    glide(voicing.level.gain, level);
  }

  private async load(name: SoundName): Promise<AudioBuffer | undefined> {
    const ctx = this.ctx;
    try {
      const response = await fetch(audioUrl(name));
      if (!ctx || !response.ok) return undefined;
      return await ctx.decodeAudioData(await response.arrayBuffer());
    } catch {
      return undefined;
    }
  }

  private applyVolume(immediate = false): void {
    const { ctx, music, settings } = this;
    if (!ctx || !music || !settings) return;
    if (immediate) music.gain.value = settings.music;
    else music.gain.setTargetAtTime(settings.music, ctx.currentTime, VOLUME_SMOOTHING);
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
export const holdMusicMood = (mood: MusicMood): (() => void) => audioService.hold(mood);
