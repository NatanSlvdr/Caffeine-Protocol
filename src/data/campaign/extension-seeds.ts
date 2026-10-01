/** Extension shift seeds keyed by shift id. Adding L22 means one entry here plus a narrative row. */
export interface LevelSeed {
  id: string;
  title: string;
  note: string;
  /** The reference line blanked in the starter, in the robots' shared language. Act IV shifts have none: they
   * start from the previous shift's programs, which the new rule breaks. */
  omission?: string;
  /** Which matching line to blank when the command repeats, counting from 1. */
  occurrence?: number;
  /** What the starter's TODO comment asks for, when the command alone would not say. */
  todo?: string;
  /** The robot whose starter loses the line; defaults to the robot the shift introduces. */
  robot?: 'prep' | 'floor';
  blocks: number;
  instructions: number;
}
export const extensionSeeds: LevelSeed[] = [
  {
    id: 'L09',
    title: 'A Brew-tiful Friendship',
    note: 'Brew waits for Query’s tickets at the order handoff and makes each drink: Take up the beans at storage, Use up the coffee machine to grind them, Take up water at the sink, Use up the machine again to brew, then Deposit up at pickup. Pip still serves the room.',
    omission: 'USE UP',
    todo: 'use up the coffee machine to grind the beans',
    blocks: 48,
    instructions: 215,
  },
  {
    id: 'L10',
    title: 'Steep Thoughts',
    note: 'Tea uses leaves, water, and steeping. Leaves skip the grinder: branch on the ticket and walk tea straight to the sink.',
    omission: 'MOVE RIGHT',
    occurrence: 4,
    todo: 'tea: move right to the sink',
    blocks: 48,
    instructions: 208,
  },
  {
    id: 'L11',
    title: 'A Spoonful of Sugar',
    note: 'Orders now ask for sugar. Store the order’s sugar in Var A, then For Var A times, Take up at the sugar station drops in one cube.',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 53,
    instructions: 241,
  },
  {
    id: 'L12',
    title: 'Call Me Maybe',
    note: 'Move the recipe into Function recipe. Call recipe makes the drink on the oldest ticket Brew is holding.',
    omission: 'CALL recipe',
    todo: 'call recipe to make the drink on the ticket',
    blocks: 57,
    instructions: 255,
  },
  {
    id: 'L13',
    title: 'Double Trouble',
    note: 'Brew now holds two cups. Claim two tickets before making them. Finished drinks leave in pickup order.',
    omission: 'LISTEN',
    todo: 'wait for orders (one ticket per cup)',
    blocks: 59,
    instructions: 499,
  },
  {
    id: 'L14',
    title: 'Special Delivery',
    note: 'Porter takes over the room. Wait for Orders claims a ready drink and Take down picks it up from pickup. Store the order’s table in Var A: Move to Var A walks Porter there by itself, and Deposit up serves it.',
    omission: 'STORE var1 FROM table',
    todo: 'store the order’s table in Var A',
    blocks: 71,
    instructions: 634,
  },
  {
    id: 'L15',
    title: 'Cups and Robbers',
    note: 'Wait for Dirty cups picks a used cup. Walk to its table, Take it up, then carry it to the sink and Deposit down.',
    omission: 'TAKE UP',
    todo: 'collect: take up the cup from the table',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L16',
    title: 'Tea for Two',
    note: 'Porter now holds two items. Take two drinks before serving, then clear both tables. The tray empties in the order it was filled.',
    omission: 'TAKE DOWN',
    todo: 'take down the first drink before claiming the second',
    blocks: 87,
    instructions: 1485,
  },
  {
    id: 'L17',
    title: 'To Go',
    note: 'Some customers order to go. Query writes To go on their ticket: If To go IN item, then Write To go. Brew puts a lid on those drinks: Take up at the lids, between the sugar and pickup. Porter leaves them on the to-go shelf by the door: walk there and Deposit down. They go in paper cups, so there’s nothing to clear.',
    blocks: 94,
    instructions: 2367,
  },
  {
    id: 'L18',
    title: 'Four Cups',
    note: 'There are only four café cups. Taking beans or leaves at storage uses a clean cup, and Porter drops the used ones in the sink. Use up at the sink washes them. When no clean cup is left, Brew waits at the sink until a used one comes back.',
    blocks: 96,
    instructions: 2565,
  },
  {
    id: 'L19',
    title: 'In a Hurry',
    note: 'Customers in a rush say so: Query writes Rush on their ticket. Rush orders jump the queue, and whoever holds one handles it first. Brew can’t wait for another ticket while it holds a rush order, and Porter can’t wait or pick up another drink while it carries one.',
    blocks: 99,
    instructions: 2631,
  },
  {
    id: 'L20',
    title: 'Last Orders',
    note: 'After the last customer, Wait for Orders reports Closed instead of waiting. Check If Closed IN Orders, and Stop. Every robot has to stop, after finishing whatever it’s holding. A robot that keeps waiting keeps the café open.',
    blocks: 108,
    instructions: 2994,
  },
  {
    id: 'L21',
    title: 'Espresso Yourself',
    note: 'Everything at once: groups, “the usual”, drinks to go, four cups, customers in a rush, and closing time.',
    blocks: 108,
    instructions: 3347,
  },
];
