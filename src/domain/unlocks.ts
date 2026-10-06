/**
 * The 1-based shift where each robot and each part of the language first appears.
 * Every level-gated rule reads its threshold from here, so the campaign table in
 * docs/campaign/README.md and the code can't drift apart.
 */
export const UNLOCKS = {
  /** Query takes orders: Wait for Orders, paper, Write coffee, Move, Deposit. */
  query: 2,
  /** Jump back to Wait for Orders: a queue of coffee drinkers. */
  loop: 3,
  /** If/Else on what the customer said, and tea. Comes after the loop so there is a queue to tell apart. */
  choices: 4,
  /** Sugar and “without” in speech, and Write sugar. */
  sugar: 5,
  /** For item in order. */
  forEach: 6,
  /** Numbers in speech, Store and Write Var A sugar. */
  numbers: 7,
  /** Unclear orders and Help. */
  help: 8,
  /** Brew runs the kitchen. */
  prep: 9,
  /** Tea reaches the kitchen: Brew branches on the ticket, and leaves skip the grinder. */
  prepTea: 10,
  /** Brew counts sugar cubes from the order into memory. */
  prepSugar: 11,
  /** Brew's recipe function. */
  functions: 12,
  /** Porter runs the dining room. */
  floor: 14,
  /** Porter clears used cups: Wait for Dirty cups. Until then Pip still clears the tables. */
  clearing: 15,
  /** Take-away orders: the to-go mark, lids and the to-go shelf. */
  toGo: 17,
  /** Only four cups: Brew washes used cups at the sink. */
  cups: 18,
  /** Customers in a rush: the rush mark, and rush orders jump the queue. */
  rush: 19,
  /** Closing time: Wait for Orders reports Closed, and every robot has to Stop. */
  closing: 20,
  /**
   * Past the campaign, the specials: a table that orders together, the together mark, and serving a table's drinks
   * on one visit.
   */
  together: 22,
} as const;

/**
 * The shift whose toolkit a level plays with, from its id: L05 is Shift 5. A special past the campaign names the
 * toolkit it borrows before its own name, so L22-together plays with everything up to Shift 22.
 */
export const shiftNumber = (levelId: string): number => parseInt(levelId.slice(1), 10);
