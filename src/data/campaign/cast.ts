import type { CastId } from '../../domain/dialogue';

export interface CastMember {
  name: string;
  /** Placeholder card colour until the character's portraits exist. */
  color: string;
  /** One line for whoever draws the portrait. */
  about: string;
  /** Robots talk in short uppercase machine type. */
  robot?: boolean;
  /** Guests are labelled as customers so they never pass for the café's crew. */
  customer?: boolean;
}

/** The name over a line, with "Customer" set apart for guests; a plain guest is simply "Customer". */
export function speakerParts(member: CastMember): { role?: string; name: string } {
  if (!member.customer) return { name: member.name };
  return member.name === 'Guest' ? { name: 'Customer' } : { role: 'Customer', name: member.name };
}

/** The same name as one string, for screen readers: "Juno, customer". */
export function speakerLabel(member: CastMember): string {
  const { role, name } = speakerParts(member);
  return role ? `${name}, ${role.toLowerCase()}` : name;
}

export const cast: Record<CastId, CastMember> = {
  niko: {
    name: 'Niko',
    color: '#b96847',
    about: 'The new owner. A young man, warm, a little tired, always has a pun ready.',
  },
  query: {
    name: 'Query',
    color: '#80a889',
    about: 'Counter robot. Literal-minded, precise, speaks in short reports.',
    robot: true,
  },
  brew: {
    name: 'Brew',
    color: '#7d9eae',
    about: 'Kitchen robot. Eager perfectionist, a bit squeaky, loves the grinder.',
    robot: true,
  },
  porter: {
    name: 'Porter',
    color: '#d4ac6b',
    about: 'Floor robot. Cheerful and chatty, occasionally clumsy.',
    robot: true,
  },
  moka: {
    name: 'Moka',
    color: '#71452f',
    about: 'The old kitchen stand-in. An elderly woman, dry, grumpy veteran of forty years of espresso.',
  },
  pip: {
    name: 'Pip',
    color: '#d98f8f',
    about: 'The little delivery stand-in. A very young helper, fast, chirpy, easily excited.',
  },
  albert: {
    name: 'Mr. Albert',
    color: '#8a7f6f',
    about: 'Elderly regular. Always orders “the usual”. It is coffee.',
    customer: true,
  },
  juno: {
    name: 'Juno',
    color: '#6f86b5',
    about: 'Student with a laptop. Tea, never sugar, mildly exasperated.',
    customer: true,
  },
  dot: { name: 'Dot', color: '#c77aa0', about: 'Sweet-toothed regular. Counts her sugars exactly.', customer: true },
  rosa: {
    name: 'Rosa',
    color: '#d0894f',
    about: 'Arrives with friends and orders for the whole group.',
    customer: true,
  },
  guest: { name: 'Guest', color: '#9b8bb4', about: 'Any customer at the counter.', customer: true },
};
