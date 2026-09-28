/** Extension shift seeds keyed by shift id. Adding L33 means one entry here plus a narrative row. */
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
    id: 'L15',
    title: 'A Brew-tiful Friendship',
    note: 'Brew claims tickets from Query at the shared order counter. Read the supplied recipe and finish by depositing the drink up onto pickup. Pip still serves the room.',
    omission: 'DEPOSIT UP',
    todo: 'deposit up the drink at pickup',
    blocks: 48,
    instructions: 215,
  },
  {
    id: 'L16',
    title: 'Tile Be Right There',
    note: 'Move uses screen directions and whole tile counts. A blocked move stops early and the next block runs. Fix the route to the ingredients.',
    omission: 'MOVE RIGHT',
    blocks: 48,
    instructions: 215,
  },
  {
    id: 'L17',
    title: 'Bean There, Done That',
    note: 'Coffee needs beans, grinding, water, then brewing. Use up runs the coffee machine: it grinds beans and brews coffee once water is in.',
    omission: 'USE UP',
    todo: 'use up the coffee machine to grind the beans',
    blocks: 48,
    instructions: 215,
  },
  {
    id: 'L18',
    title: 'Steep Thoughts',
    note: 'Tea uses leaves, water, and steeping. Leaves skip the grinder: branch on the ticket and walk tea straight to the sink.',
    omission: 'MOVE RIGHT',
    occurrence: 4,
    todo: 'tea: move right to the sink',
    blocks: 48,
    instructions: 208,
  },
  {
    id: 'L19',
    title: 'A Spoonful of Sugar',
    note: 'Orders now ask for sugar. Store the order’s sugar in Var A, then For Var A times, Take up at the sugar station drops in one cube.',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 53,
    instructions: 241,
  },
  {
    id: 'L20',
    title: 'Call Me Maybe',
    note: 'Move a repeated recipe into Function recipe. Call recipe handles the oldest unfinished ticket.',
    omission: 'CALL recipe',
    blocks: 57,
    instructions: 255,
  },
  {
    id: 'L21',
    title: 'Double Trouble',
    note: 'Brew now holds two cups. Claim two tickets before preparing them. Finished drinks leave in pickup order.',
    omission: 'LISTEN',
    todo: 'wait for orders (one ticket per cup)',
    blocks: 59,
    instructions: 499,
  },
  {
    id: 'L22',
    title: 'Kitchen Confidential',
    note: 'Keep Query and Brew working through mixed tickets and sugar requests. Pip handles delivery until Porter arrives.',
    omission: 'DEPOSIT UP',
    todo: 'deposit up the drink at pickup',
    blocks: 59,
    instructions: 499,
  },
  {
    id: 'L23',
    title: 'Special Delivery',
    note: 'Porter owns floor work now. Wait for Orders claims a ready drink; Take down collects it from the outside of the kitchen counter.',
    omission: 'TAKE DOWN',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L24',
    title: 'Latte, Where Art Thou?',
    note: 'Store the order’s table in Var A, and Move to Var A walks Porter to that table by itself. Then Deposit up onto it.',
    omission: 'STORE var1 FROM table',
    todo: 'store the order’s table in Var A',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L25',
    title: 'There and Back Again',
    note: 'Store here in Var B before leaving pickup. Move to Var B brings Porter back for the next drink.',
    omission: 'MOVE var2',
    todo: 'move back to the place in Var B',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L26',
    title: 'Cups and Robbers',
    note: 'Wait for Dirty cups picks a used cup. Take it up from its table, then Deposit down into the sink.',
    omission: 'TAKE UP',
    todo: 'collect: take up the cup from the table',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L27',
    title: 'Keep Calm and Carry On',
    note: 'Keep Porter moving between pickup and the tables. Finish each delivery and return for the next drink.',
    omission: 'DEPOSIT UP',
    todo: 'serve: deposit up onto the table',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L28',
    title: 'Highway to the Sink',
    note: 'Plan the complete delivery and clearing route. Return used cups before starting the next round.',
    omission: 'DEPOSIT DOWN',
    todo: 'return cups: deposit down into the sink',
    blocks: 83,
    instructions: 753,
  },
  {
    id: 'L29',
    title: 'Tea for Two',
    note: 'Porter now holds two items. Take two drinks before serving, then clear both tables. The tray empties in the order it was filled.',
    omission: 'TAKE DOWN',
    blocks: 87,
    instructions: 1485,
  },
  {
    id: 'L30',
    title: 'Floor Routine',
    note: 'Combine routes, clearing, and batching. Each robot works in its own area.',
    omission: 'DEPOSIT DOWN',
    todo: 'return cups: deposit down into the sink',
    blocks: 87,
    instructions: 1485,
  },
  {
    id: 'L31',
    title: 'The Three Mugsketeers',
    note: 'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
    robot: 'prep',
    omission: 'STORE var1 FROM sugar',
    todo: 'store the order’s sugar in Var A',
    blocks: 87,
    instructions: 2231,
  },
  {
    id: 'L32',
    title: 'Espresso Yourself',
    note: 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing.',
    omission: 'DEPOSIT UP',
    todo: 'serve: deposit up onto the table',
    blocks: 87,
    instructions: 2947,
  },
];
