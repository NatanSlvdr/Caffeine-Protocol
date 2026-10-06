/**
 * The repair bench's logic: a robot's sensors wired to its actions. Each action has up to two terminals, each a
 * sensor read as it is or the other way round, and fires when every wired terminal holds; an action left unwired
 * never fires. It is the same idea as a routine's If on two conditions, without the routine around it.
 */

/** One sensor on an action's terminal: `not` reads it the other way round. */
export interface Terminal {
  sensor: string;
  not?: boolean;
}

/** What each action is wired to, by action id: at most two terminals. */
export type Wiring = Readonly<Record<string, readonly Terminal[]>>;

/** At most this many terminals per action. */
export const TERMINALS = 2;

/** One worked case on the bench: what the robot meets, the sensors that read it, and what it should then do. */
export interface RepairExample {
  /** In words, as the robot meets it: “tea without sugar”. */
  input: string;
  /** The sensors on for it. */
  sensors: readonly string[];
  /** The actions it should fire, in the board's order. */
  actions: readonly string[];
}

/** Whether an action wired this way fires with these sensors on. */
export const fires = (terminals: readonly Terminal[], on: ReadonlySet<string>): boolean =>
  terminals.length > 0 && terminals.every((terminal) => on.has(terminal.sensor) !== !!terminal.not);

/** The actions a wiring fires for an example, in the board's order. */
export const firedActions = (wiring: Wiring, actions: readonly string[], sensors: readonly string[]): string[] => {
  const on = new Set(sensors);
  return actions.filter((action) => fires(wiring[action] ?? [], on));
};

/** Whether a wiring does what the example asks, no more and no less. */
export const exampleHolds = (wiring: Wiring, actions: readonly string[], example: RepairExample): boolean => {
  const fired = firedActions(wiring, actions, example.sensors);
  return fired.length === example.actions.length && fired.every((action) => example.actions.includes(action));
};

/** A wiring that does what every example asks mends the robot. */
export const wiringMends = (wiring: Wiring, actions: readonly string[], examples: readonly RepairExample[]): boolean =>
  examples.every((example) => exampleHolds(wiring, actions, example));
