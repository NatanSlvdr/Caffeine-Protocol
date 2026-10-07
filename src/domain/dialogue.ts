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
  /** Once the line is read, the player picks what Niko says next. */
  choice?: DialogueChoice;
  /** Said only when an earlier choice was answered this way. */
  recalls?: { choice: string; option: string };
  /** The line's language when it isn't the scene's: a special's own payoff, still English, before a French verdict. */
  lang?: string;
}

/**
 * A moment the player picks what Niko says. The answer is kept under `id` and recalled by later scenes; it changes
 * what is said, never what can be played or how a routine is judged.
 */
export interface DialogueChoice {
  id: string;
  options: DialogueOption[];
}

/** One answer: the words on its button, and the lines it plays, Niko's own first, then the reaction to them. */
export interface DialogueOption {
  id: string;
  label: string;
  lines: DialogueLine[];
}

/** The answers given so far, by choice id. */
export type DialogueChoices = Readonly<Record<string, string>>;

/** Whether a line is said for these answers: a line recalling an answer not given is left out. */
export const isSaid = (dialogue: DialogueLine, choices: DialogueChoices): boolean =>
  !dialogue.recalls || choices[dialogue.recalls.choice] === dialogue.recalls.option;

/** Script shorthand: `'niko:happy'`, `'query'`, or `''` for narration. */
export type Speaker = '' | CastId | `${CastId}:${Mood}`;

export function line(speaker: Speaker, text: string): DialogueLine {
  if (!speaker) return { text };
  const [who, mood] = speaker.split(':') as [CastId, Mood | undefined];
  return mood ? { who, mood, text } : { who, text };
}
