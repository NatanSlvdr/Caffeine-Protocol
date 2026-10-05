import type { Regular } from '@/domain';

/**
 * How each member of the cast looks in the 3D café, read off their portraits and cutscene art
 * (src/assets/portraits, src/assets/cutscenes). Colours are sampled from the drawings, then
 * nudged so they still read under the café lights.
 */

export type HairStyle = 'messy' | 'short' | 'bun' | 'curly' | 'curly-bun' | 'long';

export interface HumanLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  /** A second hair colour for streaks (Dot's grey curls). */
  streak?: string;
  /** Shirt, jumper or jacket; the arms share it. */
  top: string;
  /** The shirt showing at the neck under a cardigan or jacket. */
  collar?: string;
  trousers: string;
  shoes: string;
  /** The café crew wear bib aprons with dark straps. */
  apron?: { color: string; straps: string };
  hat?: { kind: 'flat-cap' | 'backwards-cap'; color: string };
  glasses?: string;
  mustache?: string;
  tie?: string;
  headband?: string;
  headphones?: string;
  scarf?: string;
  /** A hoodie's hood bunched behind the neck. */
  hood?: boolean;
  sunglasses?: string;
  /** Pip is a kid and stands shorter than the adults. */
  scale?: number;
}

export interface RobotLook {
  /** Arms, legs, torso, ear rims and antenna stem. */
  body: string;
  /** Brew and Porter wear cream aprons over their casing. */
  apron?: string;
  bean?: boolean;
  towel?: boolean;
  bowTie?: boolean;
  clipboard?: boolean;
}

const CREW_APRON = { color: '#a4532f', straps: '#4a3124' } as const;
const WHITE_SHIRT = '#f1ebdd';

export const NIKO: HumanLook = {
  skin: '#c98e62',
  hair: '#4a2e1d',
  hairStyle: 'messy',
  top: WHITE_SHIRT,
  trousers: '#545746',
  shoes: '#3b302a',
  apron: CREW_APRON,
};

export const MOKA: HumanLook = {
  skin: '#a8724e',
  hair: '#a3a19c',
  hairStyle: 'bun',
  top: WHITE_SHIRT,
  trousers: '#403a35',
  shoes: '#2e2a27',
  apron: CREW_APRON,
};

export const PIP: HumanLook = {
  skin: '#e8b68b',
  hair: '#d2692b',
  hairStyle: 'messy',
  top: '#d27c84',
  trousers: '#4e6c9b',
  shoes: '#e9e5dc',
  apron: { color: '#f3eee4', straps: '#5a3a2a' },
  hat: { kind: 'backwards-cap', color: '#2c2522' },
  scale: 0.84,
};

export const QUERY: RobotLook = { body: '#80a889', clipboard: true };
export const BREW: RobotLook = { body: '#7d9eae', apron: '#ecd9a6', bean: true, towel: true };
export const PORTER: RobotLook = { body: '#d8b163', apron: '#efdca9', bowTie: true };

/** The four regulars, as drawn in their dialogue portraits. A guest wears one only when they are that regular. */
export const REGULAR_LOOKS: Readonly<Record<Regular, HumanLook>> = {
  albert: {
    // Mr. Albert: flat cap, round glasses, white moustache, grey cardigan and a brown tie.
    skin: '#e6b893',
    hair: '#eeece6',
    hairStyle: 'short',
    top: '#78736b',
    collar: '#f3efe6',
    tie: '#6d3a25',
    trousers: '#4b4642',
    shoes: '#3b2d24',
    hat: { kind: 'flat-cap', color: '#6e604f' },
    glasses: '#3a2a1f',
    mustache: '#eeece6',
  },
  juno: {
    // Juno: curly hair up in a bun, blue hoodie, headphones round the neck.
    skin: '#8a593a',
    hair: '#2e1d15',
    hairStyle: 'curly-bun',
    top: '#5a77be',
    trousers: '#3b3f4a',
    shoes: '#e9e5dc',
    headphones: '#ece8df',
    hood: true,
  },
  dot: {
    // Dot: grey-streaked curls, pink headband, mauve cardigan over a white blouse.
    skin: '#c88d68',
    hair: '#3a3330',
    hairStyle: 'curly',
    streak: '#b9b6b1',
    top: '#b079a4',
    collar: '#f6f1e6',
    trousers: '#5a4b56',
    shoes: '#6b4a3d',
    headband: '#b86a94',
  },
  rosa: {
    // Rosa: long auburn waves, sunglasses pushed up, orange jacket over a striped top.
    skin: '#c58660',
    hair: '#7d3a21',
    hairStyle: 'long',
    top: '#c96d32',
    collar: '#eeeae2',
    trousers: '#3d4a63',
    shoes: '#6b3e2a',
    sunglasses: '#2a2522',
  },
};

/** Everyone else who comes in: plain, distinct from the regulars, and from each other. */
const GUEST_LOOKS: readonly HumanLook[] = [
  {
    // Short dark hair, lavender blazer and a cream scarf.
    skin: '#dcaa86',
    hair: '#2c211b',
    hairStyle: 'short',
    top: '#8f85b8',
    collar: '#f1ede4',
    scarf: '#f3efe4',
    trousers: '#3d3a45',
    shoes: '#2f2a27',
  },
  {
    // Short sandy hair, reading glasses, a sage cardigan.
    skin: '#e3b48e',
    hair: '#b98a52',
    hairStyle: 'short',
    top: '#6f8f6a',
    collar: '#efe9dc',
    glasses: '#3a3632',
    trousers: '#47433d',
    shoes: '#3b2d24',
  },
  {
    // Long dark hair and a wine-red jacket.
    skin: '#b07850',
    hair: '#231a16',
    hairStyle: 'long',
    top: '#a24f5a',
    trousers: '#3f4656',
    shoes: '#2f2a27',
  },
  {
    // A copper bun and a teal rain jacket.
    skin: '#f0c6a2',
    hair: '#a0582f',
    hairStyle: 'bun',
    top: '#4d8a8c',
    collar: '#f1ede4',
    trousers: '#3d3a45',
    shoes: '#e9e5dc',
  },
];

/** Passers-by on the street, in plain coats so the café's own cast stays the one you notice. */
export const PEDESTRIAN_LOOKS: readonly HumanLook[] = [
  { skin: '#dca87b', hair: '#4a3328', hairStyle: 'short', top: '#aa7965', trousers: '#393b36', shoes: '#e9e5dc' },
  { skin: '#f0c7a0', hair: '#c9a066', hairStyle: 'long', top: '#70503d', trousers: '#3d3a45', shoes: '#3b2d24' },
  { skin: '#9a6844', hair: '#2a2320', hairStyle: 'bun', top: '#9aa88f', trousers: '#4b4642', shoes: '#2f2a27' },
];

/**
 * A guest's look: a regular's own, or one of the plain looks, kept by customer id so the same guest looks the same for
 * the whole replay, even as others leave the queue.
 */
export function customerLook(customerId: string, regular?: Regular): HumanLook {
  if (regular) return REGULAR_LOOKS[regular];
  let hash = 0;
  for (const char of customerId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GUEST_LOOKS[hash % GUEST_LOOKS.length];
}
