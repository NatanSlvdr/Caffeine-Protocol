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
    this.music = ctx.createGain();
    this.music.connect(this.loopFade);
    this.applyVolume(true);
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
