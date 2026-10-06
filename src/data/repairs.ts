import type { DialogueLine } from '@/domain/dialogue';
import { line } from '@/domain/dialogue';
import { wiringMends, TERMINALS, type RepairExample, type Wiring } from '@/domain/repair';
import type { ProgressSave, RobotRole } from '@/domain/types';
import { UNLOCKS } from '@/domain/unlocks';

/** One sensor on the board, said both ways round: as it reads, and read the other way. */
export interface RepairSensor {
  id: string;
  is: string;
  isnt: string;
}

/**
 * A robot on the repair bench, in the back room: the scrapyard put its wires back any old way, and the café has run
 * on Niko's patches since. Its sensors are the conditions its routines already ask about; the player wires them to
 * its actions until every worked example comes out right, and the panel closes on a scene with a small mend.
 */
export interface Repair {
  id: string;
  robot: RobotRole;
  /** The part on the bench: “Query’s ears”. */
  title: string;
  /** What is wrong with it, said on the bench. */
  fault: string;
  /** The campaign shift whose service opens the bench, once the robot already knows every sensor on it. */
  opens: number;
  sensors: readonly RepairSensor[];
  /** The actions, in the board's order. */
  actions: readonly { id: string; label: string }[];
  /** What the robot meets, and what it should do then: the board is right when every case is. */
  examples: readonly RepairExample[];
  /** The wiring as the scrapyard left it. */
  starter: Wiring;
  /** A wiring that mends it. */
  solution: Wiring;
  /** The small mend the scene ends on, said on the bay's card once it is done. */
  touch: string;
  /** The scene once the panel closes. */
  scene: DialogueLine[];
}

export const repairs: readonly Repair[] = [
  {
    id: 'query',
    robot: 'query',
    title: 'Query’s ears',
    fault:
      'Query hears every word, but the scrapyard plugged its ears back in any old way: it writes what it hears into the wrong boxes on the ticket.',
    opens: UNLOCKS.sugar,
    sensors: [
      { id: 'tea', is: 'hears “tea”', isnt: 'doesn’t hear “tea”' },
      { id: 'sugar', is: 'hears “sugar”', isnt: 'doesn’t hear “sugar”' },
      { id: 'no', is: 'hears “no” or “without”', isnt: 'hears no “no” or “without”' },
    ],
    actions: [
      { id: 'coffee', label: 'Writes coffee' },
      { id: 'tea', label: 'Writes tea' },
      { id: 'sugar', label: 'Writes one sugar' },
    ],
    examples: [
      { input: '“coffee”', sensors: [], actions: ['coffee'] },
      { input: '“tea”', sensors: ['tea'], actions: ['tea'] },
      { input: '“coffee with sugar”', sensors: ['sugar'], actions: ['coffee', 'sugar'] },
      { input: '“tea with sugar”', sensors: ['tea', 'sugar'], actions: ['tea', 'sugar'] },
      { input: '“coffee no sugar”', sensors: ['sugar', 'no'], actions: ['coffee'] },
      { input: '“tea without sugar”', sensors: ['tea', 'sugar', 'no'], actions: ['tea'] },
    ],
    starter: {
      coffee: [{ sensor: 'sugar', not: true }],
      tea: [{ sensor: 'sugar' }],
      sugar: [{ sensor: 'tea' }],
    },
    solution: {
      coffee: [{ sensor: 'tea', not: true }],
      tea: [{ sensor: 'tea' }],
      sugar: [{ sensor: 'sugar' }, { sensor: 'no', not: true }],
    },
    touch: 'A brass clip on its clipboard, from Lou’s drawer.',
    scene: [
      line('', 'The repair bay, after closing. Niko screws Query’s side panel back on.'),
      line('query', '*bip* Self-test. “Tea without sugar.” Tea. No sugar. Wiring: correct.'),
      line('niko:happy', 'Six for six. And one more thing.'),
      line('', 'He swaps the bent clip on Query’s clipboard for a brass one from Lou’s drawer.'),
      line('query', '*bip bip* Clip: new. Clipboard: Lou’s.'),
      line('niko', 'She’d want you to have a good one.'),
    ],
  },
  {
    id: 'brew',
    robot: 'prep',
    title: 'Brew’s hands',
    fault:
      'Brew’s hands were wired from a scrapyard diagram for some other robot. They reach for the right machines at the wrong times, and grab a cup when they already hold one.',
    opens: UNLOCKS.prepSugar,
    sensors: [
      { id: 'cup', is: 'holds a clean cup', isnt: 'holds no cup' },
      { id: 'tea', is: 'ticket says tea', isnt: 'ticket says coffee' },
      { id: 'sugar', is: 'ticket asks for sugar', isnt: 'ticket asks for none' },
    ],
    actions: [
      { id: 'cup', label: 'Takes a cup' },
      { id: 'machine', label: 'Uses the coffee machine' },
      { id: 'kettle', label: 'Uses the kettle' },
      { id: 'cube', label: 'Drops in a sugar cube' },
    ],
    examples: [
      { input: 'Empty hands, a coffee ticket', sensors: [], actions: ['cup'] },
      { input: 'Empty hands, a tea ticket with sugar', sensors: ['tea', 'sugar'], actions: ['cup'] },
      { input: 'A cup, a coffee ticket', sensors: ['cup'], actions: ['machine'] },
      { input: 'A cup, a coffee ticket with sugar', sensors: ['cup', 'sugar'], actions: ['machine', 'cube'] },
      { input: 'A cup, a tea ticket', sensors: ['cup', 'tea'], actions: ['kettle'] },
      { input: 'A cup, a tea ticket with sugar', sensors: ['cup', 'tea', 'sugar'], actions: ['kettle', 'cube'] },
    ],
    starter: {
      cup: [{ sensor: 'sugar', not: true }],
      machine: [{ sensor: 'cup' }],
      kettle: [{ sensor: 'tea' }],
      cube: [{ sensor: 'sugar' }],
    },
    solution: {
      cup: [{ sensor: 'cup', not: true }],
      machine: [{ sensor: 'cup' }, { sensor: 'tea', not: true }],
      kettle: [{ sensor: 'cup' }, { sensor: 'tea' }],
      cube: [{ sensor: 'cup' }, { sensor: 'sugar' }],
    },
    touch: 'A fresh striped towel over its arm.',
    scene: [
      line('', 'The repair bay, after closing. Niko closes Brew’s chest plate. Brew turns its hands over and over.'),
      line('brew', '*BEEP BEEP!* Cup first! Then machine! Hands know now!'),
      line('niko:happy', 'And a new towel, since the old one keeps ending up on the floor.'),
      line('', 'A fresh striped towel goes over Brew’s arm.'),
      line('brew', '*soft beep* Is softest towel. Will not use on floor.'),
      line('brew', '*bip* …Mostly.'),
    ],
  },
  {
    id: 'porter',
    robot: 'floor',
    title: 'Porter’s eyes',
    fault:
      'Porter sees the pickup and the tables clearly, but its eyes were plugged in crossed: it clears cups while drinks go cold, and wanders when there is work to do.',
    opens: UNLOCKS.clearing,
    sensors: [
      { id: 'drink', is: 'sees a drink at the pickup', isnt: 'sees the pickup empty' },
      { id: 'used', is: 'sees a used cup on a table', isnt: 'sees no used cups' },
    ],
    actions: [
      { id: 'carry', label: 'Carries the drink to its table' },
      { id: 'clear', label: 'Clears a used cup' },
      { id: 'wait', label: 'Waits by the pickup' },
    ],
    examples: [
      { input: 'A drink ready, the tables clean', sensors: ['drink'], actions: ['carry'] },
      { input: 'A drink ready, a used cup out', sensors: ['drink', 'used'], actions: ['carry'] },
      { input: 'No drink, a used cup out', sensors: ['used'], actions: ['clear'] },
      { input: 'No drink, the tables clean', sensors: [], actions: ['wait'] },
    ],
    starter: {
      carry: [{ sensor: 'used' }],
      clear: [{ sensor: 'drink' }],
      wait: [{ sensor: 'drink', not: true }],
    },
    solution: {
      carry: [{ sensor: 'drink' }],
      clear: [{ sensor: 'used' }, { sensor: 'drink', not: true }],
      wait: [
        { sensor: 'drink', not: true },
        { sensor: 'used', not: true },
      ],
    },
    touch: 'Its bow tie straightened and polished.',
    scene: [
      line('', 'The repair bay, after closing. Porter blinks twice as Niko tightens the last screw.'),
      line('porter', '*ding* Drink ready: carry. Cup used: clear. Nothing: wait. Understood.'),
      line('niko:happy', 'Drinks before cups. Hold still a second.'),
      line('', 'He straightens Porter’s bow tie and rubs it to a shine with his sleeve.'),
      line('porter', '*ding ding* Bow tie: straight. Service: ready.'),
    ],
  },
];

export const repairById = (id: string): Repair | undefined => repairs.find((repair) => repair.id === id);

/** A bench is open once the shift that brings it out is served. */
export const repairOpen = (save: Pick<ProgressSave, 'stars'>, repair: Repair): boolean =>
  save.stars[repair.opens - 1] !== undefined;

// Every bench checks itself as the module loads: wired to what is on it, mendable, and broken as it comes.
for (const repair of repairs) {
  const actionIds = repair.actions.map((action) => action.id);
  const sensorIds = new Set(repair.sensors.map((sensor) => sensor.id));
  for (const wiring of [repair.starter, repair.solution])
    for (const [action, terminals] of Object.entries(wiring))
      if (
        !actionIds.includes(action) ||
        terminals.length > TERMINALS ||
        terminals.some((terminal) => !sensorIds.has(terminal.sensor))
      )
        throw new Error(`Repair ${repair.id}: ${action} is wired to something not on the board.`);
  for (const example of repair.examples)
    if (example.sensors.some((id) => !sensorIds.has(id)) || example.actions.some((id) => !actionIds.includes(id)))
      throw new Error(`Repair ${repair.id}: “${example.input}” names something not on the board.`);
  if (!wiringMends(repair.solution, actionIds, repair.examples))
    throw new Error(`Repair ${repair.id}: its solution doesn’t mend it.`);
  if (wiringMends(repair.starter, actionIds, repair.examples))
    throw new Error(`Repair ${repair.id}: it comes already mended.`);
}
