import type { Settings } from '@/domain';

/** Sound ids shipped with the game; assets stay in sync via `npm run audio:sync`. */
export type SoundName = 'click' | 'success' | 'retry' | 'serve';

/** Served audio file for a sound id, honoring the static base path. */
export function audioUrl(name: string): string {
  return `${import.meta.env.BASE_URL}audio/${name}.wav`;
}

/** Pooled one-shot effects over a looping music track; playback starts on first user gesture. */
class AudioService {
  private music?: HTMLAudioElement;
  private settings?: Settings;
  private started = false;

  configure(next: Settings): void {
    this.settings = next;
    if (this.music) this.music.volume = next.volume * next.music;
  }

  start(): void {
    if (this.started || !this.settings) return;
    this.started = true;
    this.music = new Audio(audioUrl('morning_loop'));
    this.music.loop = true;
    this.music.volume = this.settings.volume * this.settings.music;
    void this.music.play().catch(() => {
      this.started = false;
    });
  }

  play(name: SoundName): void {
    if (!this.started || !this.settings) return;
    const audio = new Audio(audioUrl(name));
    audio.volume = this.settings.volume * this.settings.effects;
    void audio.play().catch(() => {});
  }
}

export const audioService = new AudioService();
export const configureAudio = (next: Settings): void => audioService.configure(next);
export const startAudio = (): void => audioService.start();
export const playSound = (name: SoundName): void => audioService.play(name);
