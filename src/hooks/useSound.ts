import { playSound } from '@/shared/lib/audio';
import type { SoundName } from '@/shared/audio-manifest';

/** One-shot sound callback for UI events; playback starts on first user gesture. */
export function useSound(name: SoundName): () => void {
  return () => playSound(name);
}
