import { ticketUnits, belongsToPaper, ticketSugar, customerToGo } from './tickets';
import { seatingDuration, DRINK_SECONDS, STREET_EXIT_SECONDS } from './street';
import {
  BLOCK_SECONDS,
  INSTRUCTION_LIMIT,
  MAX_TRANSITIONS,
  ROBOT_STAND_IN_LEVEL,
  SIM_DURATION_SECONDS,
} from './constants';
import { compileRobot } from './robotProgram';
import { FUNCTION_END_OUTSIDE_CALL, nestedCallMessage, RETURN_OUTSIDE_CALL } from './program/interpreter';
import { floorSource, preparationSource } from './defaultPrograms';
import { gridRoute, isWalkable, samePoint, MANUAL_INTAKE, STARTS, STATIONS, TABLE_LAYOUT, tableFront } from './layout';
import type { Point } from './layout';
import { DIRECTIONS, directionLabel, directionVectors, tilesAway } from './directions';
import { interactionTarget, isOrderDeposit, moveQuery } from './queryMovement';
import { evaluateWorkerComparison, parseWorkerComparison } from './robotConditions';
import {
  evaluateConditionExpression,
  parseConditionExpression,
  parseStore,
  parseTimes,
  variableLabels,
} from './program';
import {
  commandDirection,
  parseDepositCommand,
  parseMoveCommand,
  parseMoveTo,
  parseTakeCommand,
  parseUseCommand,
  isMoveCommand,
} from './commands';
import { RECIPE_RULES, machineStep, machineStepError, recipeStepError } from './drinks';
import { satisfactionFor, tableForShift } from './scoring';
import { ROBOT_DISPLAY_NAMES, ROBOT_UNLOCK_LEVELS } from './robots';
import { UNLOCKS } from './unlocks';
import type { Failure, FailureCode, FailureContext } from './failures';
import type {
  ActorId,
  Cargo,
  ExecutionEvent,
  LevelDefinition,
  Program,
  ReplayEvent,
  RobotPrograms,
  RobotRole,
  SeedExecution,
  VariableValue,
} from './types';

type Job = {
  ticketId: string;
  table: number;
  item: 'coffee' | 'tea';
  sugar: number;
  event: ReplayEvent;
  created: number;
  status: 'ticket' | 'claimed' | 'ready' | 'reserved' | 'carried' | 'served' | 'dirty' | 'cleared';
  dirtyAt: number;
  /** Take-away: a lid, then the to-go shelf instead of a table. */
  toGo: boolean;
  /** The customer is in a rush: the order jumps the queue. */
  rush: boolean;
};
type Worker = {
  role: 'prep' | 'floor';
  actor: ActorId;
  program: Program;
  pc: number;
  stack: number[];
  /** Open For-times loops: the FOR line, the laps left, and the call depth that opened it. */
  loops: { start: number; remaining: number; depth: number }[];
  vars: Record<string, VariableValue>;
  position: Point;
  inventory: Cargo[];
  job?: Job;
  count: number;
  maxLoad: number;
  done: boolean;
  /** Wait for Orders found the café closed: nothing more will come. */
  closed?: boolean;
  pending?: { end: number; apply: () => void };
  move?: {
    started: number;
    from: Point;
    direction: Point;
    /** Move to a variable walks a route instead of a straight line. */
    path?: Point[];
    remaining: number;
    requested: number;
    completed: number;
    line: number;
    command: string;
  };
};
export interface ServiceFailure {
  role: RobotRole;
  line: number;
  time: number;
  code: FailureCode;
  context?: FailureContext;
  reason: string;
  event?: ReplayEvent;
}
export interface ServiceResult {
  execution: SeedExecution;
  failure?: ServiceFailure;
  instructions: number;
}
/** What a Take or Deposit does once it reaches a station; the station decides, as it does for Query. */
type HandAction = { verb: string; table?: number };
/** Take and Deposit reach one tile in their direction, exactly like Query's. */
function handAction(role: 'prep' | 'floor', position: Point, command: string): HandAction | undefined {
  const take = parseTakeCommand(command),
    use = parseUseCommand(command);
  const direction = (take ?? parseDepositCommand(command) ?? use)?.direction;
  if (!direction) return { verb: command };
  const target = interactionTarget(position, direction)!;
  const at = (cell: Point) => samePoint(target, cell);
  const table = TABLE_LAYOUT.findIndex((t) => at([t.x, t.z])) + 1;
  if (role === 'prep') {
    if (use) return at(STATIONS.brewer.cell) ? { verb: 'USE' } : at(STATIONS.water.cell) ? { verb: 'WASH' } : undefined;
    if (!take) return at(STATIONS.pickup.cell) ? { verb: 'DEPOSIT' } : undefined;
    if (at(STATIONS.ingredients.cell)) return { verb: 'TAKE' };
    if (at(STATIONS.water.cell)) return { verb: 'FILL WATER' };
    if (at(STATIONS.lids.cell)) return { verb: 'LID' };
    return at(STATIONS.sugar.cell) ? { verb: 'ADD SUGAR' } : undefined;
  }
  if (take) return at(STATIONS.pickup.cell) ? { verb: 'PICKUP' } : table ? { verb: 'COLLECT', table } : undefined;
  if (at(STATIONS.togo.cell)) return { verb: 'HAND OVER' };
  return table ? { verb: 'SERVE', table } : at(STATIONS.returns.cell) ? { verb: 'RETURN CUPS' } : undefined;
}
const sugarCount = (n: number) => `${n} sugar cube${n === 1 ? '' : 's'}`;
const configFor = (level: LevelDefinition) =>
  level.service ?? { prepCapacity: 1, floorCapacity: 1, clearing: true, objective: 'serve' as const };
export interface LiveService {
  pump: (time: number, log: ExecutionEvent[]) => void;
  next: () => number;
  done: () => boolean;
  attach: (execution: SeedExecution) => void;
  /** Called once when every robot the player programs has nothing left to do; the rest can play out off screen. */
  settle?: () => void;
}
/** Execute workers on a deterministic event clock; only completed actions mutate shared queues. */
export function* streamService(
  level: LevelDefinition,
  events: ReplayEvent[],
  programs: RobotPrograms,
  start = 0,
  live?: LiveService,
): Generator<number, ServiceResult> {
  const number = Number(level.id.slice(1)),
    config = configFor(level),
    seed = events[0]?.seed_id ?? level.seeds[0].id;
  const log: ExecutionEvent[] = [],
    jobs: Job[] = [],
    tableOwners = new Map<number, string>();
  let now = 0,
    failure: ServiceFailure | undefined,
    nikoPosition: Point = MANUAL_INTAKE;
  const workers: Worker[] = (['prep', 'floor'] as const).map((role) => ({
    role,
    actor: role,
    program: compileRobot(
      number >= ROBOT_UNLOCK_LEVELS[role]
        ? programs[role]
        : role === 'prep'
          ? preparationSource(ROBOT_STAND_IN_LEVEL)
          : floorSource(ROBOT_STAND_IN_LEVEL),
      role,
      number >= ROBOT_UNLOCK_LEVELS[role] ? number : ROBOT_STAND_IN_LEVEL,
    ),
    pc: 0,
    stack: [],
    loops: [],
    vars: {},
    position: STARTS[role],
    inventory: [],
    count: 0,
    maxLoad: 0,
    done: false,
  }));
  let intakeFree = 0,
    manualIndex = 0;
  let manualIntake: { end: number; apply: () => void } | undefined;
  let queryPosition: Point = STARTS.query;
  if (!live)
    for (const [index, event] of events.entries()) {
      const created =
        Math.max(intakeFree, event.customer.arrival) +
        (level.programming_enabled ? Math.max(0.1, event.trace.length * 0.1) : 9);
      intakeFree = created;
      event.table =
        event.tickets.length && !customerToGo(event.customer) ? tableForShift(index, level.active_tables) : 0;
      event.timing = {
        arrival: event.customer.arrival,
        created,
        seated: Infinity,
        ready: Infinity,
        served: Infinity,
        left: event.tickets.length ? Infinity : created,
        cleaned: event.tickets.length ? Infinity : created,
      };
      event.trace.forEach((step, i) => {
        const from = queryPosition;
        if (step.command.startsWith('MOVE ')) queryPosition = moveQuery(queryPosition, step.command);
        log.push({
          seed_id: seed,
          actor: level.programming_enabled ? 'query' : 'niko',
          role: 'query',
          start: created - (event.trace.length - i) * 0.1,
          end: created - (event.trace.length - i - 1) * 0.1,
          line: step.line,
          command: step.command,
          from,
          to: queryPosition,
          inventory: [],
          customerId: event.customer.customer_id,
        });
      });
      const submitted = log.filter(
        (e) => e.actor === 'query' && isOrderDeposit(e.command) && e.customerId === event.customer.customer_id,
      );
      for (const [ticketIndex, ticket] of (event.passed ? event.tickets : []).entries()) {
        const handoff = submitted[ticketIndex]?.end ?? created;
        ticket.table_id = event.table ? `T${String(event.table).padStart(2, '0')}` : null;
        ticket.status = 'created';
        ticket.created_at = handoff;
        for (const unit of ticketUnits(ticket))
          jobs.push({
            ticketId: unit.ticket_id,
            table: event.table,
            item: ticket.item as 'coffee' | 'tea',
            sugar: ticketSugar(ticket),
            event,
            created: level.programming_enabled ? handoff : Infinity,
            status: 'ticket',
            dirtyAt: Infinity,
            toGo: !!ticket.to_go,
            rush: !!ticket.rush,
          });
      }
    }
  let queryFailure = events.find((e) => !e.passed);
  live?.attach({ seed_id: seed, start, duration: Infinity, events: log });
  const fail = (
    w: Worker,
    code: FailureCode,
    message: string,
    { line = w.program.source_lines[w.pc] ?? -1, context }: { line?: number; context?: FailureContext } = {},
  ) => {
    // After closing, a robot that still acts as if more work were coming only needed to finish up and stop.
    const name = ROBOT_DISPLAY_NAMES[w.role];
    const closed = w.closed && !w.job && code === 'no-job';
    const reason = closed
      ? w.inventory.length
        ? `The café is closed, so nothing more is coming: after Wait for Orders, check If Closed IN Orders, finish the ${w.inventory[0].item} ${name} holds, and Stop.`
        : `The café is closed and ${name} has nothing left to do: after Wait for Orders, check If Closed IN Orders and Stop.`
      : message;
    failure = {
      role: w.role,
      line,
      time: now,
      code: closed ? 'open-after-closing' : code,
      context,
      reason,
      event: w.job?.event ?? jobs.find((j) => j.ticketId === w.inventory[0]?.ticketId)?.event ?? events[0],
    };
    log.push({
      seed_id: seed,
      actor: w.actor,
      role: w.role,
      start: now,
      end: now,
      line,
      command: w.program.instructions[w.pc] ?? 'END OF PROGRAM',
      from: w.position,
      to: w.position,
      inventory: structuredClone(w.inventory),
      error: reason,
    });
  };
  const failWith = (w: Worker, failure: Failure) => fail(w, failure.code, failure.reason, failure);
  const jobOf = (cargo: Cargo | undefined) => jobs.find((j) => j.ticketId === cargo?.ticketId);
  /** Orders from customers in a rush come first. */
  const rushFirst = (cups: Cargo[]) => cups.find((cup) => cup.stage !== 'dirty' && jobOf(cup)?.rush) ?? cups[0];
  /**
   * The cup a robot is working on. Porter serves its tray in order, rush drinks first. Brew finishes
   * the cup it started before the next one it claimed: mid-recipe, then brewed, then claimed.
   */
  const currentCargo = (w: Worker) =>
    w.role === 'floor'
      ? rushFirst(w.inventory)
      : (rushFirst(w.inventory.filter((c) => c.stage !== 'claimed' && c.stage !== 'brewed')) ??
        rushFirst(w.inventory.filter((c) => c.stage === 'brewed')) ??
        rushFirst(w.inventory));
  const currentJob = (w: Worker) => (w.role === 'floor' && w.job ? w.job : jobOf(currentCargo(w)));
  const memory = (w: Worker) => (Object.keys(w.vars).length ? { variables: { ...w.vars } } : {});
  const moveNext = (w: Worker, move = w.move!): Point =>
    move.path?.[move.completed] ?? [w.position[0] + move.direction[0], w.position[1] + move.direction[1]];
  const record = (
    w: Worker,
    command: string,
    line: number,
    from: Point,
    end: number,
    extra: Partial<ExecutionEvent> = {},
  ) =>
    log.push({
      seed_id: seed,
      actor: w.actor,
      role: w.role,
      start: now,
      end,
      line,
      command,
      from,
      to: w.position,
      inventory: structuredClone(w.inventory),
      customerId: currentJob(w)?.event.customer.customer_id,
      ...memory(w),
      ...extra,
    });
  const schedule = (
    w: Worker,
    seconds: number,
    command: string,
    line: number,
    apply: () => void,
    extra: Partial<ExecutionEvent> = {},
  ) => {
    const kind = extra.action ?? command;
    const actionJob =
      kind === 'DEPOSIT' || kind === 'ADD SUGAR'
        ? jobs.find((j) => j.ticketId === w.inventory.find((c) => c.stage === 'brewed')?.ticketId)
        : (currentJob(w) ?? (isWait(command) ? nextWork(w, command) : undefined));
    const automatic = number < ROBOT_UNLOCK_LEVELS[w.role];
    const duration = live ? (automatic ? seconds / 12 : BLOCK_SECONDS / (w.move?.requested ?? 1)) : seconds;
    const from = w.position,
      begin = now,
      end = now + duration;
    const preview: ExecutionEvent = {
      seed_id: seed,
      actor: w.actor,
      role: w.role,
      start: begin,
      end,
      line,
      command,
      from,
      to: w.move ? moveNext(w) : from,
      inventory: structuredClone(w.inventory),
      customerId: actionJob?.event.customer.customer_id,
      ticketId: actionJob?.ticketId,
      ...memory(w),
      ...extra,
    };
    if (live) log.push(preview);
    w.pending = {
      end,
      apply: () => {
        apply();
        if (live) {
          preview.to = w.position;
          preview.inventory = structuredClone(w.inventory);
          Object.assign(preview, memory(w));
        } else
          log.push({
            seed_id: seed,
            actor: w.actor,
            role: w.role,
            start: begin,
            end,
            line,
            command,
            from,
            to: w.position,
            inventory: structuredClone(w.inventory),
            customerId: actionJob?.event.customer.customer_id,
            ticketId: actionJob?.ticketId,
            ...memory(w),
            ...extra,
          });
      },
    };
  };
  const station = (w: Worker, p: Point, name: string) => {
    if (!samePoint(w.position, p)) {
      fail(w, 'out-of-reach', `Move to ${name} first: it’s ${tilesAway(w.position, p)} from here.`);
      return false;
    }
    return true;
  };
  /** A Take or Deposit that reached no station: say where this robot's next one belongs. */
  const handMiss = (w: Worker, c: string): Failure => {
    const take = !!parseTakeCommand(c),
      use = !!parseUseCommand(c),
      verb = use ? 'Use' : take ? 'Take' : 'Deposit',
      cargo = currentCargo(w),
      tableCell = (table: number): Point => [TABLE_LAYOUT[table - 1].x, TABLE_LAYOUT[table - 1].z];
    const goal: [stand: Point, cell: Point, name: string] | undefined =
      w.role === 'prep'
        ? use
          ? [STATIONS.brewer.prep, STATIONS.brewer.cell, 'the coffee machine']
          : !take
            ? [STATIONS.pickup.prep, STATIONS.pickup.cell, 'the pickup counter']
            : cargo?.stage === 'claimed'
              ? [STATIONS.ingredients.prep, STATIONS.ingredients.cell, 'the storage counter']
              : cargo?.stage === 'ground' || cargo?.stage === 'leaves'
                ? [STATIONS.water.prep, STATIONS.water.cell, 'the sink']
                : cargo?.stage === 'brewed' && jobOf(cargo)?.toGo && !cargo.lid && cargo.sugar === jobOf(cargo)?.sugar
                  ? [STATIONS.lids.prep, STATIONS.lids.cell, 'the lids']
                  : w.inventory.some((item) => item.stage === 'brewed')
                    ? [STATIONS.sugar.prep, STATIONS.sugar.cell, 'the sugar station']
                    : undefined
        : take
          ? w.job && w.job.dirtyAt !== Infinity
            ? [tableFront(w.job.table - 1), tableCell(w.job.table), `table ${w.job.table}`]
            : w.job
              ? [STATIONS.pickup.floor, STATIONS.pickup.cell, 'the drink pickup']
              : undefined
          : cargo?.stage === 'dirty'
            ? [STATIONS.returns.floor, STATIONS.returns.cell, 'the sink']
            : cargo && jobOf(cargo)?.toGo
              ? [STATIONS.togo.floor, STATIONS.togo.cell, 'the to-go shelf']
              : cargo
                ? [tableFront(cargo.table - 1), tableCell(cargo.table), `table ${cargo.table}`]
                : undefined;
    if (!goal)
      return take || w.inventory.length
        ? {
            code: 'nothing-there',
            reason: `There’s nothing for ${ROBOT_DISPLAY_NAMES[w.role]} to ${verb.toLowerCase()} there yet.`,
          }
        : { code: 'empty-hands', reason: `${ROBOT_DISPLAY_NAMES[w.role]} isn’t holding anything to deposit.` };
    const [stand, cell, name] = goal;
    if (!samePoint(w.position, stand))
      return { code: 'out-of-reach', reason: `Move to ${name} first: it’s ${tilesAway(w.position, stand)} from here.` };
    const direction = DIRECTIONS.find((d) => samePoint(interactionTarget(stand, d)!, cell))!,
      used = commandDirection(c);
    return {
      code: 'wrong-direction',
      reason: `${name[0].toUpperCase() + name.slice(1)} is ${direction === 'UP' ? 'above' : 'below'} ${
        ROBOT_DISPLAY_NAMES[w.role]
      }: use ${verb} ${directionLabel(direction)}.`,
      context: { expected: directionLabel(direction), ...(used && { actual: directionLabel(used) }) },
    };
  };
  /** What Store reads: Brew's sugar from the drink it's finishing, Porter's table and place. */
  const storedValue = (w: Worker, source: string): VariableValue | undefined => {
    if (source === 'here') return [w.position[0], w.position[1]];
    if (source === 'table') return currentJob(w)?.table;
    const cup = rushFirst(w.inventory.filter((item) => item.stage === 'brewed')) ?? currentCargo(w);
    return jobOf(cup)?.sugar;
  };
  const capacity = (w: Worker) => (w.role === 'prep' ? config.prepCapacity : config.floorCapacity);
  const condition = (w: Worker, c: string) => {
    const job = currentJob(w);
    const expression = parseConditionExpression(`IF ${c}`);
    if (expression) {
      const tokens = [
        ...(job ? [job.item, ...(job.sugar > 0 ? ['sugar'] : []), ...(job.toGo ? ['togo'] : [])] : []),
        ...(job?.rush ? ['rush'] : []),
        ...(w.closed ? ['closed'] : []),
      ];
      return evaluateConditionExpression(expression, { 'CUSTOMER SPEECH': { tokens } });
    }
    // Saved programs may still hold the older ticket comparisons, like IF count = 2.
    const comparison = parseWorkerComparison(`IF ${c}`);
    if (comparison) {
      const speech = { drink: job?.item, with_sugar: (job?.sugar ?? 0) > 0, sugar_count: job?.sugar };
      return evaluateWorkerComparison(comparison, speech, speech);
    }
    return c.startsWith('TABLE ') ? job?.table === Number(c.slice(6)) : false;
  };
  // Take-away drinks go to the shelf, so they don't wait for a seated customer.
  const canClaimDrink = (j: Job) =>
    j.status === 'ready' &&
    (j.toGo || (j.event.timing.seated <= now && tableOwners.get(j.table) === j.event.customer.customer_id));
  /** Wait for Orders brings Brew its next ticket and Porter its next ready drink; rush orders jump the queue. */
  const isWait = (c: string) => c === 'LISTEN' || c === 'WAIT DIRTY';
  const firstOf = (ready: (j: Job) => boolean) => jobs.find((j) => j.rush && ready(j)) ?? jobs.find(ready);
  const nextWork = (w: Worker, c: string) =>
    c === 'LISTEN' && w.role === 'prep'
      ? firstOf((j) => j.status === 'ticket' && j.created <= now)
      : c === 'LISTEN'
        ? firstOf(canClaimDrink)
        : jobs.find((j) => j.status === 'dirty' && j.dirtyAt <= now);
  /** Every customer has ordered, so no new ticket will ever reach the kitchen. */
  const allOrdered = () => (!live || live.done()) && events.every((event) => event.timing.created <= now);
  /** At closing time a wait with nothing left to come reports Closed instead of waiting forever. */
  const closedFor = (w: Worker, c: string) =>
    !!config.closing &&
    allOrdered() &&
    !jobs.some((j) =>
      w.role === 'prep'
        ? j.status === 'ticket'
        : c === 'LISTEN'
          ? ['ticket', 'claimed', 'ready'].includes(j.status)
          : j.status !== 'cleared',
    );
  /** Clean cups on the shelf, and used ones in the sink waiting for Brew to wash them. */
  let cleanCups = config.cups || Infinity,
    sinkCups = 0;
  const markWaiting = (w: Worker, line: number, command: string) => {
    if (!live) return;
    const previous = log.at(-1);
    if (
      previous?.actor === w.actor &&
      previous.line === line &&
      previous.command === command &&
      previous.start === now &&
      previous.end === now
    )
      return;
    log.push({
      seed_id: seed,
      actor: w.actor,
      role: w.role,
      start: now,
      end: now,
      line,
      command,
      from: w.position,
      to: w.position,
      inventory: structuredClone(w.inventory),
      customerId: currentJob(w)?.event.customer.customer_id,
    });
  };
  const step = (w: Worker): boolean => {
    if (w.done || w.pending || failure) return false;
    const p = w.program,
      c = p.instructions[w.pc],
      line = p.source_lines[w.pc] ?? -1;
    if (p.compile_error) {
      fail(w, 'compile', p.compile_error, { line: p.error_line });
      return false;
    }
    if (c === undefined) {
      w.done = true;
      return true;
    }
    const name = ROBOT_DISPLAY_NAMES[w.role];
    // A rush order goes first: no waiting for more work while holding one.
    const rushed = w.inventory.find((cup) => cup.stage !== 'dirty' && jobOf(cup)?.rush);
    if (rushed && isWait(c)) {
      fail(
        w,
        'rush-first',
        w.role === 'prep'
          ? `This ${rushed.item} is for someone in a rush: make it before waiting for another ticket.`
          : `This ${rushed.item} is for someone in a rush: serve it before anything else.`,
      );
      return false;
    }
    if (isWait(c) && !nextWork(w, c)) {
      if (closedFor(w, c) && w.closed) {
        fail(
          w,
          'open-after-closing',
          `The café is closed: Stop ${name} instead of waiting for more ${c === 'LISTEN' ? 'orders' : 'cups'}.`,
        );
        return false;
      }
      if (!closedFor(w, c)) {
        markWaiting(w, line, c);
        return false;
      }
    }
    // With every clean cup in use, washing waits at the sink for the next used one.
    if (config.cups && !cleanCups && !sinkCups && !w.move && handAction(w.role, w.position, c)?.verb === 'WASH') {
      markWaiting(w, line, c);
      return false;
    }
    if (w.move) {
      const move = w.move,
        next = moveNext(w, move);
      if (!move.remaining || !isWalkable(next, w.role)) {
        const complete = () => {
          record(w, move.command, move.line, move.from, now, {
            requested: move.requested,
            completed: move.completed,
            from: w.position,
          });
          w.move = undefined;
          w.pc++;
        };
        const end = move.started + BLOCK_SECONDS;
        if (live && number >= ROBOT_UNLOCK_LEVELS[w.role] && end > now + 1e-8) {
          log.push({
            seed_id: seed,
            actor: w.actor,
            role: w.role,
            start: now,
            end,
            line: move.line,
            command: move.command,
            from: w.position,
            to: w.position,
            inventory: structuredClone(w.inventory),
            requested: move.requested,
            completed: move.completed,
          });
          w.pending = { end, apply: complete };
        } else complete();
        return true;
      }
      schedule(
        w,
        1,
        move.command,
        line,
        () => {
          w.position = next;
          move.remaining--;
          move.completed++;
        },
        { requested: move.requested, completed: move.completed + 1 },
      );
      return true;
    }
    if (++w.count > INSTRUCTION_LIMIT) {
      // A loop of blocks that take no time (Ifs, Stores, Jumps) piles these up while the clock stands still.
      fail(
        w,
        'loop-limit',
        `${name} keeps going round its loop without doing anything: put Wait for Orders inside it, so ${name} waits for its next ${w.role === 'prep' ? 'ticket' : 'job'}.`,
      );
      return false;
    }
    if (isMoveCommand(c)) {
      const move = parseMoveCommand(c);
      if (!move) {
        fail(w, 'unsupported', `Unknown movement direction: ${c.split(' ')[1]}`);
        return false;
      }
      const direction: Point = directionVectors[move.direction];
      w.move = {
        started: now,
        from: w.position,
        direction,
        remaining: move.count,
        requested: move.count,
        completed: 0,
        line,
        command: c,
      };
      return true;
    }
    const moveTo = parseMoveTo(c);
    if (moveTo) {
      const value = w.vars[moveTo],
        name = variableLabels(moveTo);
      if (value === undefined) {
        fail(w, 'unset-variable', `Store a table or a place in ${name} before moving to it.`);
        return false;
      }
      if (typeof value === 'number' && !TABLE_LAYOUT[value - 1]) {
        fail(w, 'wrong-variable-kind', `${name} holds ${value}, and there’s no table ${value}.`);
        return false;
      }
      // Porter finds its own way around the furniture, one tile at a time.
      const path = gridRoute(w.position, typeof value === 'number' ? tableFront(value - 1) : value, w.role).slice(1);
      w.move = {
        started: now,
        from: w.position,
        direction: [0, 0],
        path,
        remaining: path.length,
        requested: path.length,
        completed: 0,
        line,
        command: c,
      };
      return true;
    }
    const control = (apply: () => void) => {
      if (live) schedule(w, 1, c, line, apply);
      else {
        apply();
        record(w, c, line, w.position, now);
      }
      return true;
    };
    // Closing time: the wait reports Closed and the program carries on, so it can Stop.
    if (isWait(c) && !nextWork(w, c))
      return control(() => {
        w.closed = true;
        w.pc++;
      });
    if (c === 'STOP') {
      if (w.inventory.length) {
        fail(w, 'unfinished-work', `${name} is still holding a ${w.inventory[0].item}: finish it before stopping.`);
        return false;
      }
      if (!w.closed) {
        fail(
          w,
          'stopped-early',
          `It isn’t closing time yet: ${name} still has work coming. Stop only after Wait for Orders reports Closed.`,
        );
        return false;
      }
      return control(() => {
        w.done = true;
      });
    }
    const stored = parseStore(c);
    if (stored) {
      if (stored.value === 'table' && currentJob(w)?.toGo) {
        fail(
          w,
          'to-go-to-shelf',
          `This ${currentJob(w)!.item} is to go: it has no table. Take it to the to-go shelf by the door.`,
        );
        return false;
      }
      const value = storedValue(w, stored.value);
      if (value === undefined) {
        // Name the Wait blocks that hand this robot a job: Porter's can come from either.
        const waits = w.role === 'floor' && config.clearing ? 'Orders or Wait for Dirty cups' : 'Orders';
        fail(
          w,
          'no-job',
          `Wait for ${waits} first: ${ROBOT_DISPLAY_NAMES[w.role]} has no ${w.role === 'prep' ? 'ticket' : 'job'} yet, so there’s no ${stored.value} to store.`,
        );
        return false;
      }
      return control(() => {
        w.vars[stored.variable] = value;
        w.pc++;
      });
    }
    const times = parseTimes(c);
    if (times) {
      const count = w.vars[times],
        end = p.ends[w.pc];
      if (typeof count !== 'number') {
        fail(
          w,
          count === undefined ? 'unset-variable' : 'wrong-variable-kind',
          count === undefined
            ? `Store a number in ${variableLabels(times)} before looping on it.`
            : `${variableLabels(times)} holds a place, not a number to count.`,
        );
        return false;
      }
      return control(() => {
        if (count > 0) {
          w.loops.push({ start: w.pc, remaining: count, depth: w.stack.length });
          w.pc++;
        } else w.pc = end + 1;
      });
    }
    if (c === 'END' && parseTimes(p.instructions[p.ends[w.pc]] ?? '')) {
      const start = p.ends[w.pc];
      return control(() => {
        const loop = w.loops.at(-1);
        if (loop?.start === start && --loop.remaining > 0) w.pc = start + 1;
        else {
          if (loop?.start === start) w.loops.pop();
          w.pc++;
        }
      });
    }
    if (c.startsWith('IF ')) {
      return control(() => {
        w.pc = condition(w, c.slice(3)) ? w.pc + 1 : (p.alternatives[w.pc] ?? p.ends[w.pc]) + 1;
      });
    }
    if (c === 'ELSE') {
      record(w, c, line, w.position, now);
      w.pc = p.ends[w.pc] + 1;
      return true;
    }
    if (c.startsWith('FUNCTION ')) {
      w.pc = p.ends[w.pc] + 1;
      return true;
    }
    if (c.startsWith('CALL ')) {
      if (w.stack.length) {
        fail(w, 'recursive-call', nestedCallMessage(p, w.pc));
        return false;
      }
      return control(() => {
        w.stack.push(w.pc + 1);
        w.pc = p.functions[c.slice(5)] + 1;
      });
    }
    if (c === 'RETURN' || (c === 'END' && p.instructions[p.ends[w.pc]]?.startsWith('FUNCTION '))) {
      const back = w.stack.pop();
      if (back === undefined) {
        // An End is only reached without a Call when a Jump landed inside the function.
        fail(
          w,
          c === 'RETURN' ? 'return-outside-call' : 'jump-across-block',
          c === 'RETURN' ? RETURN_OUTSIDE_CALL : FUNCTION_END_OUTSIDE_CALL,
        );
        return false;
      }
      return control(() => {
        w.pc = back;
        w.loops = w.loops.filter((loop) => loop.depth <= w.stack.length);
      });
    }
    if (c.startsWith('POSITION ')) {
      w.pc++;
      return true;
    }
    if (c.startsWith('JUMP ')) {
      if (w.stack.length) {
        fail(w, 'jump-across-block', 'Finish the function before jumping back.');
        return false;
      }
      return control(() => {
        w.pc = p.positions[c.slice(5)];
        w.loops = [];
      });
    }
    if (c === 'END') {
      return control(() => {
        w.pc++;
      });
    }
    const hand = handAction(w.role, w.position, c);
    if (!hand) {
      failWith(w, handMiss(w, c));
      return false;
    }
    const cargo = currentCargo(w);
    // The coffee machine picks its step from the cup Brew hands it.
    const a = hand.verb === 'USE' && cargo ? (machineStep(cargo) ?? 'USE') : hand.verb;
    let apply: () => void = () => {},
      seconds = 1;
    if (c === 'LISTEN' && w.role === 'prep') {
      if (!station(w, STATIONS.orders.prep, 'the order handoff')) return false;
      if (w.inventory.length >= capacity(w)) {
        fail(w, 'hands-full', 'Brew’s hands are full. Deposit a drink before waiting for another ticket.');
        return false;
      }
      const next = nextWork(w, c)!;
      apply = () => {
        next.status = 'claimed';
        w.inventory.push({ ticketId: next.ticketId, table: next.table, item: next.item, stage: 'claimed', sugar: 0 });
      };
    } else if (isWait(c)) {
      if (w.job) {
        fail(w, 'one-job-at-a-time', 'Finish this delivery or cup before waiting for another.');
        return false;
      }
      const next = nextWork(w, c)!;
      apply = () => {
        w.job = next;
        next.status = 'reserved';
        if (c === 'LISTEN' && !next.toGo) tableOwners.set(next.table, next.event.customer.customer_id);
      };
    } else if (a === 'PICKUP') {
      if (rushed) {
        fail(w, 'rush-first', `This ${rushed.item} is for someone in a rush: serve it before anything else.`);
        return false;
      }
      if (!w.job || w.job.status !== 'reserved' || w.job.dirtyAt !== Infinity) {
        fail(w, 'no-job', 'Wait for a ready drink before taking one.');
        return false;
      }
      if (w.inventory.length >= capacity(w)) {
        fail(w, 'hands-full', 'Tray is full. Serve a carried item first.');
        return false;
      }
      const next = w.job;
      apply = () => {
        next.status = 'carried';
        w.inventory.push({
          ticketId: next.ticketId,
          table: next.table,
          item: next.item,
          stage: 'brewed',
          sugar: next.sugar,
        });
        w.job = undefined;
      };
    } else if (a === 'SERVE' || a === 'HAND OVER') {
      const served = jobOf(cargo);
      if (!cargo || cargo.stage !== 'brewed' || !served) {
        fail(w, 'empty-hands', 'Carry a ready drink before serving.');
        return false;
      }
      if (served.toGo !== (a === 'HAND OVER')) {
        fail(
          w,
          served.toGo ? 'to-go-to-shelf' : 'stay-in-to-table',
          served.toGo
            ? `This ${cargo.item} is to go: take it to the to-go shelf by the door, and Deposit down onto it.`
            : `This ${cargo.item} is for table ${cargo.table}, not the to-go shelf.`,
          {
            context: served.toGo
              ? { expected: 'shelf', actual: hand.table }
              : { expected: cargo.table, actual: 'shelf' },
          },
        );
        return false;
      }
      if (a === 'SERVE' && hand.table !== cargo.table) {
        fail(w, 'wrong-table', `This drink is for table ${cargo.table}, not table ${hand.table}.`, {
          context: { expected: cargo.table, actual: hand.table },
        });
        return false;
      }
      if (a === 'SERVE' && served.event.timing.seated > now) {
        markWaiting(w, line, c);
        return false;
      }
      const paper = served.event.tickets.find((t) => belongsToPaper(served.ticketId, t))!;
      const group = jobs.filter((j) => j.event === served.event);
      apply = () => {
        w.inventory.splice(w.inventory.indexOf(cargo), 1);
        served.event.timing.served = now;
        if (a === 'HAND OVER') {
          // The customer takes it straight away, in a paper cup: there's nothing to clear.
          served.status = 'cleared';
          if (jobs.filter((j) => belongsToPaper(j.ticketId, paper)).every((j) => j.status === 'cleared'))
            paper.status = 'served';
          if (group.every((j) => j.status === 'cleared')) served.event.timing.left = served.event.timing.cleaned = now;
          return;
        }
        served.status = 'served';
        served.dirtyAt = now + DRINK_SECONDS;
        if (jobs.filter((j) => belongsToPaper(j.ticketId, paper)).every((j) => Number.isFinite(j.dirtyAt)))
          paper.status = 'served';
        if (
          group.length === served.event.tickets.reduce((sum, t) => sum + (t.quantity ?? 1), 0) &&
          served.event.tickets.every((ticket) => ticket.status === 'served')
        )
          served.event.timing.left = Math.max(...group.map((drink) => drink.dirtyAt));
      };
    } else if (a === 'COLLECT') {
      if (!w.job || w.job.dirtyAt > now) {
        // Holding a drink's job, or before Porter clears tables, a Take at a table is just the wrong place.
        const drinkJob = w.job?.dirtyAt === Infinity;
        if (drinkJob || !config.clearing) failWith(w, handMiss(w, c));
        else fail(w, 'no-job', 'Wait for dirty cups before collecting one.');
        return false;
      }
      if (hand.table !== w.job.table) {
        fail(w, 'wrong-dirty-table', `The dirty cup is on table ${w.job.table}, not table ${hand.table}.`, {
          context: { expected: w.job.table, actual: hand.table },
        });
        return false;
      }
      if (w.inventory.length >= capacity(w)) {
        fail(w, 'hands-full', 'Tray is full. Return cups before collecting another.');
        return false;
      }
      const next = w.job;
      apply = () => {
        w.inventory.push({ ticketId: next.ticketId, table: next.table, item: next.item, stage: 'dirty', sugar: 0 });
        next.status = 'carried';
        w.job = undefined;
      };
    } else if (a === 'RETURN CUPS') {
      const cup = w.inventory.find((item) => item.stage === 'dirty'),
        cupJob = jobOf(cup);
      if (!cup || !cupJob) {
        fail(w, 'empty-hands', 'Carry a used cup before returning it.');
        return false;
      }
      apply = () => {
        w.inventory.splice(w.inventory.indexOf(cup), 1);
        cupJob.status = 'cleared';
        cupJob.event.timing.cleaned = now;
        if (config.cups) sinkCups++;
        if (jobs.filter((j) => j.event === cupJob.event).every((j) => j.status === 'cleared'))
          tableOwners.delete(cupJob.table);
      };
    } else if (a === 'WASH') {
      // Washing clears the whole sink; with clean cups left and an empty sink it's a quick look.
      seconds = sinkCups ? 2 : 1;
      apply = () => {
        cleanCups += sinkCups;
        sinkCups = 0;
      };
    } else {
      // Beans or leaves start the next claimed cup, rush orders first, once nothing is mid-recipe.
      const cup =
        a === 'TAKE'
          ? (rushFirst(w.inventory.filter((item) => item.stage !== 'claimed' && item.stage !== 'brewed')) ??
            rushFirst(w.inventory.filter((item) => item.stage === 'claimed')))
          : cargo;
      const cupJob = jobOf(cup);
      if (!cup || !cupJob) {
        fail(w, 'no-job', 'Wait for an order ticket before preparing a drink.');
        return false;
      }
      if (a === 'USE') {
        fail(w, cup.stage === 'brewed' ? 'already-brewed' : 'recipe-order', machineStepError(cup));
        return false;
      }
      const recipeCommand = a === 'TAKE' ? (cupJob.item === 'coffee' ? 'TAKE BEANS' : 'TAKE LEAVES') : a;
      const rule = RECIPE_RULES[recipeCommand];
      // Once brewed, sugar, the lid and the deposit work on the finished drink, rush orders first.
      const finished = rushFirst(w.inventory.filter((item) => item.stage === 'brewed'));
      if (a === 'ADD SUGAR' || a === 'DEPOSIT' || a === 'LID') {
        const ready = finished,
          readyJob = jobOf(ready);
        if (!ready || !readyJob) {
          fail(
            w,
            'not-brewed',
            a === 'LID'
              ? 'Finish brewing before putting a lid on.'
              : 'Finish brewing before taking sugar or depositing.',
          );
          return false;
        }
        if (a === 'LID') {
          if (!readyJob.toGo) {
            fail(w, 'lid-extra', `This ${ready.item} is staying in: it doesn’t need a lid.`, {
              context: { expected: false, actual: true },
            });
            return false;
          }
          if (ready.lid) {
            fail(w, 'lid-extra', `This ${ready.item} already has its lid.`);
            return false;
          }
          if (ready.sugar !== readyJob.sugar) {
            fail(
              w,
              'sugar-before-lid',
              `Put the sugar in before the lid: this ${ready.item} takes ${sugarCount(readyJob.sugar)}.`,
            );
            return false;
          }
          apply = () => {
            ready.lid = true;
          };
        } else if (a === 'ADD SUGAR') {
          if (ready.lid) {
            fail(w, 'sugar-before-lid', `This ${ready.item} already has its lid on: sugar goes in before the lid.`);
            return false;
          }
          // Each Take up at the sugar station drops in one cube.
          if (ready.sugar >= readyJob.sugar) {
            fail(
              w,
              'too-much-sugar',
              readyJob.sugar
                ? `This ${ready.item} takes ${sugarCount(readyJob.sugar)}, and it already has them.`
                : `This ${ready.item} takes no sugar.`,
              // The cube it was about to drop in is the one too many.
              { context: { expected: readyJob.sugar, actual: ready.sugar + 1 } },
            );
            return false;
          }
          apply = () => {
            ready.sugar++;
          };
        } else {
          if (ready.sugar !== readyJob.sugar) {
            fail(
              w,
              'sugar-count',
              `This ${ready.item} takes ${sugarCount(readyJob.sugar)}, but it has ${ready.sugar}.`,
              {
                context: { expected: readyJob.sugar, actual: ready.sugar },
              },
            );
            return false;
          }
          if (readyJob.toGo && !ready.lid) {
            fail(
              w,
              'lid-missing',
              `This ${ready.item} is to go: put a lid on it first. The lids are between the sugar and pickup.`,
              { context: { expected: true, actual: false } },
            );
            return false;
          }
          apply = () => {
            w.inventory.splice(w.inventory.indexOf(ready), 1);
            readyJob.status = 'ready';
            readyJob.event.timing.ready = now;
          };
        }
      } else if (rule) {
        // Take and Use reached their station already.
        if (!rule.previous.includes(cup.stage) || (rule.item && rule.item !== cup.item)) {
          fail(w, 'recipe-order', recipeStepError(recipeCommand, cup));
          return false;
        }
        // Café cups are counted; take-away drinks go in paper cups.
        const cafeCup = a === 'TAKE' && !cupJob.toGo && !!config.cups;
        if (cafeCup && !cleanCups) {
          fail(
            w,
            'no-clean-cups',
            `There are no clean cups left: all ${config.cups} are in use. Wash the used ones first: Use up at the sink.`,
          );
          return false;
        }
        seconds = rule.duration ?? 1;
        apply = () => {
          cup.stage = rule.stage;
          if (cafeCup) cleanCups--;
        };
      } else {
        fail(w, 'unsupported', `Unsupported action: ${c}`);
        return false;
      }
    }
    schedule(
      w,
      seconds,
      c,
      line,
      () => {
        apply();
        w.maxLoad = Math.max(w.maxLoad, w.inventory.length);
        w.pc++;
      },
      a === c ? {} : { action: a },
    );
    return true;
  };
  const finished = () =>
    jobs.every((j) =>
      config.objective === 'prepare'
        ? ['ready', 'reserved', 'carried', 'served', 'dirty', 'cleared'].includes(j.status)
        : config.objective === 'pickup'
          ? ['carried', 'served', 'dirty', 'cleared'].includes(j.status)
          : config.clearing
            ? j.status === 'cleared'
            : ['served', 'dirty', 'cleared'].includes(j.status),
    );
  // A service Porter clears can only stall on cups nobody collected while Porter is the player's robot.
  const dirtyLeft = () => {
    const worker = workers.find((w) => w.role === 'floor' && number >= ROBOT_UNLOCK_LEVELS.floor);
    const job = config.clearing && worker ? jobs.find((j) => j.status === 'dirty') : undefined;
    return worker && job ? { worker, job } : undefined;
  };
  // Query is done once live.done(); Brew once every drink left its hands; Porter once the whole service is finished.
  const playerDone = () =>
    workers
      .filter((w) => number >= ROBOT_UNLOCK_LEVELS[w.role])
      .every(
        (w) =>
          !w.pending &&
          !w.move &&
          !w.inventory.length &&
          (w.role === 'prep' ? jobs.every((j) => j.status !== 'ticket' && j.status !== 'claimed') : finished()),
      );
  let settled = false,
    transitions = 0;
  while (!failure && now <= SIM_DURATION_SECONDS && transitions++ < MAX_TRANSITIONS) {
    if (live) {
      live.pump(now, log);
      queryFailure = events.find((e) => !e.passed);
      for (const event of events)
        for (const ticket of event.tickets) {
          if (jobs.some((j) => belongsToPaper(j.ticketId, ticket))) continue;
          for (const unit of ticketUnits(ticket))
            jobs.push({
              ticketId: unit.ticket_id,
              table: event.table,
              item: ticket.item as 'coffee' | 'tea',
              sugar: ticketSugar(ticket),
              event,
              created: ticket.created_at,
              status: 'ticket',
              dirtyAt: Infinity,
              toGo: !!ticket.to_go,
              rush: !!ticket.rush,
            });
        }
    }
    if (queryFailure && now >= queryFailure.timing.created) {
      const position = log.findLast((e) => e.actor === 'query')?.to ?? STARTS.query;
      failure = {
        role: 'query',
        line: queryFailure.failure_line ?? 0,
        time: now,
        code: queryFailure.failure_code ?? 'unsupported',
        context: queryFailure.failure_context,
        reason: queryFailure.reason ?? 'Query’s routine failed.',
        event: queryFailure,
      };
      log.push({
        seed_id: seed,
        actor: 'query',
        role: 'query',
        start: now,
        end: now,
        line: failure.line,
        command: queryFailure.trace.at(-1)?.command ?? 'COMPILE',
        from: position,
        to: position,
        inventory: [],
        error: failure.reason,
        customerId: queryFailure.customer.customer_id,
      });
      break;
    }
    for (const w of workers)
      if (w.pending && w.pending.end <= now) {
        const pending = w.pending;
        w.pending = undefined;
        pending.apply();
      }
    if (manualIntake && manualIntake.end <= now) {
      const intake = manualIntake;
      manualIntake = undefined;
      intake.apply();
    }
    if (
      !live &&
      !level.programming_enabled &&
      !manualIntake &&
      manualIndex < events.length &&
      events[manualIndex].customer.arrival <= now
    ) {
      const event = events[manualIndex++],
        path = gridRoute(nikoPosition, MANUAL_INTAKE);
      let arrival = now;
      path.slice(1).forEach((to, i) =>
        log.push({
          seed_id: seed,
          actor: 'niko',
          role: 'query',
          start: arrival,
          end: ++arrival,
          line: -1,
          command: 'WALK TO ORDER COUNTER',
          from: path[i],
          to,
          inventory: [],
        }),
      );
      const end = arrival + 9;
      intakeFree = end;
      log.push({
        seed_id: seed,
        actor: 'niko',
        role: 'query',
        start: arrival,
        end,
        line: -1,
        command: 'TAKE ORDER',
        from: MANUAL_INTAKE,
        to: MANUAL_INTAKE,
        inventory: [],
        customerId: event.customer.customer_id,
      });
      manualIntake = {
        end,
        apply: () => {
          nikoPosition = MANUAL_INTAKE;
          event.timing.created = end;
          for (const job of jobs.filter((j) => j.event === event)) {
            job.created = end;
            event.tickets.find((t) => belongsToPaper(job.ticketId, t))!.created_at = end;
          }
        },
      };
    }
    for (const job of jobs) if (job.status === 'served' && job.dirtyAt <= now) job.status = 'dirty';
    // Reserve a table as the customer chooses it; delivery waits for the seated timestamp.
    for (const [index, event] of events.entries()) {
      // Take-away customers wait by the to-go shelf as soon as they've ordered.
      if (event.timing.created <= now && event.tickets.length && !event.table && event.timing.seated === Infinity)
        event.timing.seating = event.timing.seated = event.timing.created;
      else if (
        event.timing.created <= now &&
        event.tickets.length &&
        event.timing.seated === Infinity &&
        !tableOwners.has(event.table)
      ) {
        tableOwners.set(event.table, event.customer.customer_id);
        event.timing.seating = now;
        event.timing.seated = now + seatingDuration(event.table - 1, (index % 2) as 0 | 1);
      }
      if (!config.clearing && event.timing.left <= now && tableOwners.get(event.table) === event.customer.customer_id)
        tableOwners.delete(event.table);
    }
    if (live?.settle && !settled && level.programming_enabled && live.done() && playerDone()) {
      settled = true;
      live.settle();
    }
    if (
      (!live || live.done()) &&
      finished() &&
      workers.every((w) => !w.pending) &&
      workers.every((w) => !w.move) &&
      // At closing time the service ends once every robot the player programs has stopped.
      (!config.closing || workers.filter((w) => number >= ROBOT_UNLOCK_LEVELS[w.role]).every((w) => w.done)) &&
      now >= intakeFree &&
      (config.objective !== 'serve' ||
        events.every((event) => !event.tickets.length || now >= event.timing.left + STREET_EXIT_SECONDS))
    ) {
      const floor = workers[1],
        loadWorker = number < ROBOT_UNLOCK_LEVELS.floor ? workers[0] : floor;
      if ((config.minLoad ?? 0) > loadWorker.maxLoad)
        fail(
          loadWorker,
          'carry-more',
          loadWorker.role === 'prep'
            ? `Brew made every drink one at a time: this shift, claim ${config.minLoad} tickets and make them in one trip.`
            : `Porter carried one item at a time: this shift, fill the tray with ${config.minLoad} before setting off.`,
        );
      // Call Me Maybe is about naming the recipe: a flat recipe still serves, but misses the shift's point.
      else if (number === UNLOCKS.functions && !workers[0].program.instructions.includes('CALL recipe'))
        fail(
          workers[0],
          'recipe-not-function',
          'Brew served every ticket, but its recipe isn’t in a function yet: this shift, the steps go in Function recipe, and Brew uses Call recipe for each ticket.',
        );
      break;
    }
    let advanced = false;
    for (const w of workers) {
      if (config.objective === 'prepare' && w.role === 'floor') continue;
      advanced = step(w) || advanced;
    }
    if (failure) break;
    if (advanced) continue;
    const future = [
      ...events
        .flatMap((event) => [
          event.timing.created,
          event.timing.seated,
          event.timing.left,
          event.timing.left + STREET_EXIT_SECONDS,
        ])
        .filter((t) => t > now),
      ...(live ? [live.next()] : []),
      ...(queryFailure && queryFailure.timing.created > now ? [queryFailure.timing.created] : []),
      ...(manualIntake ? [manualIntake.end] : []),
      ...(!live && !level.programming_enabled && manualIndex < events.length
        ? [events[manualIndex].customer.arrival]
        : []),
      ...workers.flatMap((w) => (w.pending ? [w.pending.end] : [])),
      ...jobs.filter((j) => j.status === 'ticket' && j.created > now).map((j) => j.created),
      ...jobs.filter((j) => j.status === 'served' && j.dirtyAt > now).map((j) => j.dirtyAt),
    ].filter((t) => Number.isFinite(t) && t > now);
    if (!future.length) {
      const washer = workers.find(
        (w) => w.role === 'prep' && handAction('prep', w.position, w.program.instructions[w.pc] ?? '')?.verb === 'WASH',
      );
      if (washer && config.cups && !cleanCups && !sinkCups)
        fail(
          washer,
          'no-clean-cups',
          `Brew is waiting at the sink for a used cup, but none are coming back: all ${config.cups} cups are out. Porter has to bring them back.`,
        );
      else if (!finished() && dirtyLeft())
        fail(
          dirtyLeft()!.worker,
          'table-not-cleared',
          `A used cup is still on table ${dirtyLeft()!.job.table}. Porter has to clear it: Wait for Dirty cups, take it up, and carry it to the sink.`,
        );
      else if (!finished()) {
        // A robot that ran past its last line (rather than Stopping at closing) left its work behind.
        const ranOut = workers.find((w) => w.done && !w.closed && number >= ROBOT_UNLOCK_LEVELS[w.role]);
        // Otherwise the robot sitting on unfinished work is the one to fix, not the one waiting for it.
        const holding = workers.find((w) => !w.done && w.inventory.length && number >= ROBOT_UNLOCK_LEVELS[w.role]);
        const stuck = ranOut ?? holding ?? workers.find((w) => !w.done) ?? workers[0];
        const name = ROBOT_DISPLAY_NAMES[stuck.role];
        const cargo = stuck.inventory[0];
        fail(
          stuck,
          ranOut ? 'end-of-routine' : !holding ? 'starved' : 'unfinished-work',
          ranOut
            ? `${name} reached the end of its routine with work still to do: put a jump destination at the top and a Jump back to it at the end, so ${name} goes back for the next ${stuck.role === 'prep' ? 'ticket' : 'job'}.`
            : !holding
              ? `${name} is waiting here, but nothing more is coming its way, and the service isn’t finished. Check where the work it’s waiting for got stuck.`
              : cargo.stage === 'dirty'
                ? `${name} is still holding a used cup, and it never reached the sink: finish clearing it before waiting for more work.`
                : stuck.role === 'prep'
                  ? `${name} is still holding a ${cargo.item}, and its guest is waiting for it: finish it and leave it at pickup before waiting for another ticket.`
                  : `${name} is still holding the ${cargo.item} for ${cargo.table ? `table ${cargo.table}` : 'the to-go shelf'}, and its guest is waiting for it: serve it before waiting for more work.`,
        );
      } else if (config.closing) {
        const open = workers.find((w) => number >= ROBOT_UNLOCK_LEVELS[w.role] && !w.done);
        if (open)
          fail(
            open,
            'open-after-closing',
            `${ROBOT_DISPLAY_NAMES[open.role]} is keeping the café open: Stop it once Wait for Orders reports Closed.`,
          );
      }
      break;
    }
    const next = Math.min(...future);
    yield next;
    now = next;
  }
  if (!failure && (now > SIM_DURATION_SECONDS || transitions >= MAX_TRANSITIONS)) {
    // Blame the robot still on the move, not one patiently waiting for work that never came.
    const busy =
      workers.find(
        (w) => number >= ROBOT_UNLOCK_LEVELS[w.role] && !w.done && !isWait(w.program.instructions[w.pc] ?? ''),
      ) ?? workers[0];
    fail(
      busy,
      'loop-limit',
      `An hour went by and the service still isn’t finished: ${ROBOT_DISPLAY_NAMES[busy.role]} keeps going round its loop without reaching its next job.`,
    );
  }
  for (const event of events) {
    const created = Number.isFinite(event.timing.created) ? event.timing.created : Math.max(now, event.timing.arrival);
    const served = Number.isFinite(event.timing.served) ? event.timing.served : Math.max(now, created);
    event.satisfaction = satisfactionFor(created, event.timing.arrival, served);
  }
  if (failure) {
    for (let i = log.length - 1; i >= 0; i--) if (log[i].start > failure.time) log.splice(i, 1);
  }
  log.sort((a, b) => a.start - b.start || a.end - b.end);
  return {
    execution: {
      seed_id: seed,
      start,
      duration: failure
        ? Math.max(0.1, Math.min(failure.time, SIM_DURATION_SECONDS))
        : Math.max(1, Math.min(now, SIM_DURATION_SECONDS), ...log.map((e) => e.end)),
      events: log,
    },
    failure,
    instructions: workers.filter((w) => number >= ROBOT_UNLOCK_LEVELS[w.role]).reduce((n, w) => n + w.count, 0),
  };
}
