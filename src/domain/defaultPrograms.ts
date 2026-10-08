import { gridRoute, STARTS, STATIONS } from './layout';
import type { Point } from './layout';
import type { RobotRole } from './types';
import { MAX_MOVE_COUNT } from './constants';
import { UNLOCKS } from './unlocks';
/** Build readable reference MOVE counts from a route; player execution never calls this helper. */
export function movementSource(from: Point, to: Point, role?: RobotRole) {
  const path = gridRoute(from, to, role),
    moves: { direction: string; count: number }[] = [];
  path.slice(1).forEach((p, i) => {
    const prev = path[i],
      direction = p[0] > prev[0] ? 'RIGHT' : p[0] < prev[0] ? 'LEFT' : p[1] > prev[1] ? 'DOWN' : 'UP';
    const last = moves.at(-1);
    if (last?.direction === direction && last.count < MAX_MOVE_COUNT) last.count++;
    else moves.push({ direction, count: 1 });
  });
  return moves.map((m) => `MOVE ${m.direction} ${m.count}`);
}
/** The odd rules of an Act IV shift that change what the robots have to do. */
export interface ShiftRules {
  /** Take-away orders: a lid, then the to-go shelf. */
  toGo?: boolean;
  /** Only a few cups: wash the used ones. */
  cups?: boolean;
  /** Rush orders: make and serve them before waiting for more. */
  rush?: boolean;
  /** Closing time: Stop once Wait for Orders reports Closed. */
  closing?: boolean;
  /** Tables that order together: Porter waits for the rest of the order and serves it on one visit. */
  together?: boolean;
  /**
   * Drinks go cold at pickup: Porter serves the next drink before clearing the cup before it. Only with closing time,
   * when the last cup is cleared.
   */
  fresh?: boolean;
  /** A drink runs out: Query asks with Help what a guest who asked for it will have instead. */
  soldOut?: boolean;
  /** The grinder is out for its service for a while: Brew takes pre-ground coffee straight to the sink. */
  preground?: boolean;
  /**
   * A dishwasher on the coffee machine's socket washes the cups: Brew starts its wash on the way from the machine to
   * the sugar, the longest way round before the machine runs again. Only with cups.
   */
  dishwasher?: boolean;
}
const STOP_WHEN_CLOSED = (before: string[] = []) => ['IF closed IN CUSTOMER SPEECH', ...before, 'STOP', 'END'];
export function preparationSource(level: number, batch = 1, rules: ShiftRules = {}) {
  const at = STATIONS;
  const move = (a: Point, b: Point) => movementSource(a, b, 'prep');
  // Take up reaches the station above Brew: storage, then the sink's water, then sugar and lids; Use up runs the
  // coffee machine, and at the sink washes the used cups.
  const sweetened = level >= UNLOCKS.prepSugar;
  // Where the drink's way to pickup starts: the coffee machine, or the sink if Brew started the dishwasher there.
  const afterBrew = rules.dishwasher ? at.water.prep : at.brewer.prep;
  const sugar = sweetened
    ? [...move(afterBrew, at.sugar.prep), 'STORE var1 FROM sugar', 'FOR var1 TIMES', 'TAKE UP', 'END']
    : [];
  const afterSugar = sweetened ? at.sugar.prep : afterBrew;
  const lid = rules.toGo
    ? [
        ...move(afterSugar, at.lids.prep),
        'IF togo IN CUSTOMER SPEECH',
        'TAKE UP',
        'END',
        ...move(at.lids.prep, at.pickup.prep),
      ]
    : move(afterSugar, at.pickup.prep);
  const grind = [...move(at.ingredients.prep, at.grinder.prep), 'USE UP', ...move(at.grinder.prep, at.water.prep)];
  // Until tea reaches the kitchen every ticket is a coffee, so there is nothing to branch on yet.
  const ingredients =
    level >= UNLOCKS.prepTea
      ? [
          // While the grinder is out for its service, coffee comes pre-ground and goes straight to the sink, as tea does.
          rules.preground
            ? 'IF coffee IN CUSTOMER SPEECH AND preground NOT IN CUSTOMER SPEECH'
            : 'IF coffee IN CUSTOMER SPEECH',
          ...grind,
          'ELSE',
          ...move(at.ingredients.prep, at.water.prep),
          'END',
        ]
      : grind;
  const recipe = [
    ...move(STARTS.prep, at.ingredients.prep),
    'TAKE UP',
    ...ingredients,
    'TAKE UP',
    ...move(at.water.prep, at.brewer.prep),
    'USE UP',
    // The dishwasher shares the coffee machine's socket: Brew starts its wash with the longest way to go before the
    // machine runs again, on the brewed drink's way to its sugar.
    ...(rules.dishwasher ? [...move(at.brewer.prep, at.water.prep), 'USE UP', ...move(at.water.prep, afterBrew)] : []),
    ...sugar,
    ...lid,
    'DEPOSIT UP',
    ...(rules.cups && !rules.dishwasher
      ? [...move(at.pickup.prep, at.water.prep), 'USE UP', ...move(at.water.prep, STARTS.prep)]
      : move(at.pickup.prep, STARTS.prep)),
  ];
  const functions = level >= UNLOCKS.functions;
  const call = functions ? ['CALL recipe'] : recipe;
  // Each claim may find the café closed: make what's already claimed, then stop.
  const waits = Array.from({ length: batch }, (_, i) => [
    'LISTEN',
    ...(rules.closing ? STOP_WHEN_CLOSED(Array.from({ length: i }, () => call).flat()) : []),
    // A rush order is made straight away, before waiting for another ticket.
    ...(rules.rush && i + 1 < batch ? ['IF rush IN CUSTOMER SPEECH', ...call, 'JUMP listen', 'END'] : []),
  ]).flat();
  return (
    functions
      ? [
          'POSITION listen',
          ...waits,
          ...Array.from({ length: batch }, () => 'CALL recipe'),
          'JUMP listen',
          'FUNCTION recipe',
          ...recipe,
          'RETURN',
          'END',
        ]
      : ['POSITION listen', ...waits, ...recipe, 'JUMP listen']
  ).join('\n');
}
export function floorSource(level: number, batch = 1, rules: ShiftRules = {}) {
  // Porter keeps its starting place in Var B, reads each order's table into Var A and walks there by itself.
  // A table that orders together gets the rest of its order on the same visit.
  const serve = [
    'STORE var1 FROM table',
    'MOVE var1',
    'DEPOSIT UP',
    ...(rules.together ? ['IF together IN CUSTOMER SPEECH', 'DEPOSIT UP', 'END'] : []),
    'MOVE var2',
  ];
  // The sink sits below the tile right of Porter's start.
  const clear = [
    'WAIT DIRTY',
    'STORE var1 FROM table',
    'MOVE var1',
    'TAKE UP',
    'MOVE var2',
    ...movementSource(STARTS.floor, STATIONS.returns.floor, 'floor'),
    'DEPOSIT DOWN',
    ...movementSource(STATIONS.returns.floor, STARTS.floor, 'floor'),
  ];
  const clearing = level >= UNLOCKS.clearing;
  if (rules.fresh) {
    // A cup behind: the first drink goes out on its own, then each one before the cup before it comes back, so no
    // drink waits at pickup on a guest still drinking. At closing time the last cup is cleared before stopping.
    if (batch !== 1 || !clearing || !rules.closing || rules.toGo || rules.cups || rules.rush || rules.together)
      throw new Error('Porter keeps drinks warm one at a time, clearing as it goes, until closing time.');
    return [
      'STORE var2 FROM here',
      'LISTEN',
      'TAKE DOWN',
      'CALL deliver',
      'POSITION listen',
      'LISTEN',
      ...STOP_WHEN_CLOSED(['CALL clear']),
      'TAKE DOWN',
      'CALL deliver',
      'CALL clear',
      'JUMP listen',
      'FUNCTION deliver',
      ...serve,
      'RETURN',
      'END',
      'FUNCTION clear',
      ...clear,
      'RETURN',
      'END',
    ].join('\n');
  }
  if (rules.toGo || rules.cups || rules.rush || rules.closing || rules.together) {
    // One drink at a time: rush orders never wait on the tray, and every table cup is cleared as it's served.
    if (batch !== 1) throw new Error('Porter handles the odd rules one drink at a time.');
    const toGo = rules.toGo
      ? [
          'IF togo IN CUSTOMER SPEECH',
          ...movementSource(STARTS.floor, STATIONS.togo.floor, 'floor'),
          'DEPOSIT DOWN',
          'MOVE var2',
          'ELSE',
        ]
      : [];
    return [
      'STORE var2 FROM here',
      'POSITION listen',
      'LISTEN',
      ...(rules.closing ? STOP_WHEN_CLOSED() : []),
      'TAKE DOWN',
      // Wait for Orders brings the rest of a Together table's order next; both cups are cleared once served.
      ...(rules.together
        ? [
            'IF together IN CUSTOMER SPEECH',
            'LISTEN',
            'TAKE DOWN',
            'CALL deliver',
            ...(clearing ? ['CALL clear', 'CALL clear'] : []),
            'JUMP listen',
            'END',
          ]
        : []),
      ...toGo,
      'CALL deliver',
      ...(clearing ? ['CALL clear'] : []),
      ...(rules.toGo ? ['END'] : []),
      'JUMP listen',
      'FUNCTION deliver',
      ...serve,
      'RETURN',
      'END',
      ...(clearing ? ['FUNCTION clear', ...clear, 'RETURN', 'END'] : []),
    ].join('\n');
  }
  return [
    'STORE var2 FROM here',
    'POSITION listen',
    ...Array.from({ length: batch }, () => ['LISTEN', 'TAKE DOWN']).flat(),
    ...Array.from({ length: batch }, () => ['CALL deliver']).flat(),
    ...(clearing ? Array.from({ length: batch }, () => ['CALL clear']).flat() : []),
    'JUMP listen',
    'FUNCTION deliver',
    ...serve,
    'RETURN',
    'END',
    ...(clearing ? ['FUNCTION clear', ...clear, 'RETURN', 'END'] : []),
  ].join('\n');
}
