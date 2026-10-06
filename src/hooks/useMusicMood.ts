import { useEffect } from 'react';
import { holdMusicMood, type MusicMood } from '@/shared/lib/audio';

/** Voices the music for the place on screen while it is mounted; the mood asked for last is the one heard. */
export function useMusicMood(mood: MusicMood): void {
  useEffect(() => holdMusicMood(mood), [mood]);
}
