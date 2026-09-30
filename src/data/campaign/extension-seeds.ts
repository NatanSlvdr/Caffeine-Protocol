/** Extension shift seeds keyed by shift id. Adding L22 means one entry here plus a narrative row. */
export interface LevelSeed {
  id: string;
  title: string;
  note: string;
  /** The reference line blanked in the starter, in the robots' shared language. */
  omission: string;
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
    blocks: 83,
    instructions: 753,
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
    blocks: 87,
    instructions: 1485,
  },
  {
    id: 'L17',
    title: 'To Go',
    note: 'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
    robot: 'prep',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 87,
    instructions: 2231,
  },
  {
    id: 'L18',
    title: 'Four Cups',
    note: 'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
    robot: 'prep',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 87,
    instructions: 2231,
  },
  {
    id: 'L19',
    title: 'In a Hurry',
    note: 'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
    robot: 'prep',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 87,
    instructions: 2231,
  },
  {
    id: 'L20',
    title: 'Last Orders',
    note: 'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
    robot: 'prep',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 87,
    instructions: 2231,
  },
  {
    id: 'L21',
    title: 'Espresso Yourself',
    note: 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing.',
    omission: 'DEPOSIT UP',
    todo: 'serve: deposit up onto the table',
    blocks: 87,
    instructions: 2947,
  },
];
