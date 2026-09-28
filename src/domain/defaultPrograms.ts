import { gridRoute, STARTS, STATIONS } from './layout';
import type { Point } from './layout';
import type { RobotRole } from './types';
import { MAX_MOVE_COUNT } from './constants';
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
export function preparationSource(level: number, batch = 1) {
  const at = STATIONS;
  const move = (a: Point, b: Point) => movementSource(a, b, 'prep');
  // Take up reaches the station above Brew: storage, then the sink's water, then sugar; Use up runs the coffee machine.
  const sugar =
    level >= 19
      ? [
          ...move(at.brewer.prep, at.sugar.prep),
          'STORE var1 FROM sugar',
          'FOR var1 TIMES',
          'TAKE UP',
          'END',
          ...move(at.sugar.prep, at.pickup.prep),
        ]
      : move(at.brewer.prep, at.pickup.prep);
  const recipe = [
    ...move(STARTS.prep, at.ingredients.prep),
    'TAKE UP',
    'IF coffee IN CUSTOMER SPEECH',
    ...move(at.ingredients.prep, at.grinder.prep),
    'USE UP',
    ...move(at.grinder.prep, at.water.prep),
    'ELSE',
    ...move(at.ingredients.prep, at.water.prep),
    'END',
    'TAKE UP',
    ...move(at.water.prep, at.brewer.prep),
    'USE UP',
    ...sugar,
    'DEPOSIT UP',
    ...move(at.pickup.prep, STARTS.prep),
  ];
  const waits = Array.from({ length: batch }, () => 'LISTEN');
  return (
    level >= 20
      ? [
          ...waits,
          ...Array.from({ length: batch }, () => 'CALL recipe'),
          'REPEAT',
          'FUNCTION recipe',
          ...recipe,
          'RETURN',
          'END',
        ]
      : [...waits, ...recipe, 'REPEAT']
  ).join('\n');
}
export function floorSource(level: number, batch = 1) {
  // Porter keeps its starting place in Var B, reads each order's table into Var A and walks there by itself.
  const serve = ['STORE var1 FROM table', 'MOVE var1', 'DEPOSIT UP', 'MOVE var2'];
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
  return [
    'STORE var2 FROM here',
    ...Array.from({ length: batch }, () => ['LISTEN', 'TAKE DOWN']).flat(),
    ...Array.from({ length: batch }, () => ['CALL deliver']).flat(),
    ...(level >= 23 ? Array.from({ length: batch }, () => ['CALL clear']).flat() : []),
    'REPEAT',
    'FUNCTION deliver',
    ...serve,
    'RETURN',
    'END',
    ...(level >= 23 ? ['FUNCTION clear', ...clear, 'RETURN', 'END'] : []),
  ].join('\n');
}
