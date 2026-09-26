export interface Act {
  kicker: string;
  /** Who the act belongs to, printed large on its ticket. */
  crew: string;
  tagline: string;
  from: number;
  to: number;
}

/** The campaign as orders on the kitchen rail: one ticket per act, one line per shift. */
export const acts: Act[] = [
  { kicker: 'Prologue', crew: 'Niko', tagline: 'Watch a service run by hand.', from: 0, to: 2 },
  { kicker: 'Act I', crew: 'Query', tagline: 'Teach the counter robot to take orders.', from: 2, to: 14 },
  { kicker: 'Act II', crew: 'Brew', tagline: 'Teach the kitchen robot every recipe.', from: 14, to: 22 },
  { kicker: 'Act III', crew: 'Porter', tagline: 'Teach the floor robot the room.', from: 22, to: 30 },
  { kicker: 'Finale', crew: 'The whole crew', tagline: 'Three robots, one café, one last service.', from: 30, to: 32 },
];

export const actIndexFor = (shift: number) =>
  Math.max(
    0,
    acts.findIndex((act) => shift >= act.from && shift < act.to),
  );
