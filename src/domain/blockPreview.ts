import { commandDirection } from './commands';
import { STATIONS, TABLE_LAYOUT, samePoint, tableFront, type Point } from './layout';
import { interactionTarget } from './queryMovement';
import type { ExecutionEvent, RobotRole, SeedExecution } from './types';

/** What a block does in the café that can be shown there: a walk, or a reach into the tile beside the robot. */
export type PreviewKind = 'move' | 'reach';

/** Whether a block can be shown in the café, and how: Move walks, Take, Deposit and Use reach. */
export function previewKind(command: string): PreviewKind | undefined {
  const verb = command.trim().split(' ')[0];
  if (verb === 'MOVE') return 'move';
  if (['TAKE', 'PICKUP', 'DEPOSIT', 'USE'].includes(verb)) return 'reach';
  return undefined;
}

/** One way a block went when it ran: the same walk, or the same reach, however many times it was made. */
export interface BlockVisit {
  /** The tiles walked, from where the block began to where it ended; one tile when it stayed put. */
  path: Point[];
  /** For a Take, Deposit or Use: the tile it reached into. */
  target?: Point;
  /** What the station there made of it, like GRIND or SERVE. */
  action?: string;
  /** Why it stopped the run, if it did. */
  error?: string;
  /** How many times it went this way. */
  times: number;
}

/** A block of one robot's routine, shown in the café by the ways it went in a dry run of the first round. */
export interface BlockPreview {
  role: RobotRole;
  kind: PreviewKind;
  visits: readonly BlockVisit[];
}

/**
 * Every way one block went in a round: each run of it, from the first record of it to the last before the robot moved
 * on, gathered by where it went. A walk of three tiles is three records of one run; the same walk made each time round
 * a loop is one way, made that many times.
 */
export function blockVisits(execution: SeedExecution, role: RobotRole, line: number): BlockVisit[] {
  const runs: ExecutionEvent[][] = [];
  let previous: ExecutionEvent | undefined;
  for (const event of execution.events) {
    if (event.role !== role || event.actor === 'niko') continue;
    if (event.line === line) {
      if (previous?.line === line) runs.at(-1)!.push(event);
      else runs.push([event]);
    }
    previous = event;
  }
  const visits = new Map<string, BlockVisit>();
  for (const run of runs) {
    const path: Point[] = [run[0].from];
    for (const event of run) if (!samePoint(path.at(-1)!, event.to)) path.push(event.to);
    const direction = commandDirection(run[0].command);
    const target =
      previewKind(run[0].command) === 'reach' && direction ? interactionTarget(path.at(-1)!, direction) : undefined;
    const action = run.find((e) => e.action)?.action;
    const error = run.find((e) => e.error)?.error;
    const key = JSON.stringify([path, target, action, error]);
    const known = visits.get(key);
    if (known) known.times++;
    else
      visits.set(key, {
        path,
        ...(target && { target }),
        ...(action && { action }),
        ...(error && { error }),
        times: 1,
      });
  }
  return [...visits.values()];
}

/** The station names a tile can go by, for the words beside a preview. */
const STATION_NAMES: Record<string, string> = {
  orders: 'the order handoff',
  ingredients: 'storage',
  grinder: 'the coffee machine',
  brewer: 'the coffee machine',
  water: 'the sink',
  sugar: 'the sugar',
  lids: 'the lids',
  pickup: 'the pickup counter',
  returns: 'the sink',
  togo: 'the to-go shelf',
};

/** Query's paper is on the counter a tile above where it starts. */
const PAPER: Point = [STATIONS.orders.query[0], STATIONS.orders.query[1] - 1];

/** What is on a counter tile or table a robot reaches into: "the coffee machine", "table 3"; nothing if it is bare. */
export function reachedName(target: Point): string | undefined {
  if (samePoint(target, PAPER)) return 'the paper';
  const table = TABLE_LAYOUT.findIndex((t) => samePoint(target, [t.x, t.z]));
  if (table >= 0) return `table ${table + 1}`;
  const station = Object.entries(STATIONS).find(([, s]) => samePoint(target, s.cell));
  return station && STATION_NAMES[station[0]];
}

/** The station a robot stands at on a tile, as it would be named: "the sink", "table 2"; nothing between stations. */
export function standingName(tile: Point, role: RobotRole): string | undefined {
  // Query listens at the register, and steps along to the handoff to put tickets down.
  if (role === 'query') return samePoint(tile, STATIONS.orders.query) ? 'the register' : 'the order handoff';
  if (role === 'floor') {
    const table = TABLE_LAYOUT.findIndex((_, i) => samePoint(tile, tableFront(i)));
    if (table >= 0) return `table ${table + 1}`;
  }
  const station = Object.entries(STATIONS).find(([, s]) => {
    const spot = (s as Partial<Record<RobotRole, Point>>)[role];
    return spot && samePoint(tile, spot);
  });
  return station && STATION_NAMES[station[0]];
}
