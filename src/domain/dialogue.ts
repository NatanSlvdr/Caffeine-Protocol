/** Everyone who can speak in a dialogue: the owner, the robots, the stand-ins, and the regulars. */
export const CAST_IDS = [
  'niko',
  'query',
  'brew',
  'porter',
  'moka',
  'pip',
  'albert',
  'juno',
  'dot',
  'rosa',
  'guest',
] as const;
export type CastId = (typeof CAST_IDS)[number];

/** Portrait expressions. Every character needs `neutral`; the others fall back to it. */
export const MOODS = ['neutral', 'happy', 'worried', 'surprised'] as const;
export type Mood = (typeof MOODS)[number];

/** One beat of a scene: a character speaking, or narration when `who` is absent. */
export interface DialogueLine {
  who?: CastId;
  mood?: Mood;
  text: string;
}

/** Script shorthand: `'niko:happy'`, `'query'`, or `''` for narration. */
export type Speaker = '' | CastId | `${CastId}:${Mood}`;

export function line(speaker: Speaker, text: string): DialogueLine {
  if (!speaker) return { text };
  const [who, mood] = speaker.split(':') as [CastId, Mood | undefined];
  return mood ? { who, mood, text } : { who, text };
}
