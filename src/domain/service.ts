import { ticketUnits, belongsToPaper, ticketSugar } from './tickets';
import { seatingDuration, DRINK_SECONDS, STREET_EXIT_SECONDS } from './street';
import {
  BLOCK_SECONDS,
  INSTRUCTION_LIMIT,
  MAX_TRANSITIONS,
  ROBOT_STAND_IN_LEVEL,
  SIM_DURATION_SECONDS,
} from './constants';
import { compileRobot } from './robotProgram';
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
    if (use) return at(STATIONS.brewer.cell) ? { verb: 'USE' } : undefined;
    if (!take) return at(STATIONS.pickup.cell) ? { verb: 'DEPOSIT' } : undefined;
    if (at(STATIONS.ingredients.cell)) return { verb: 'TAKE' };
    if (at(STATIONS.water.cell)) return { verb: 'FILL WATER' };
    return at(STATIONS.sugar.cell) ? { verb: 'ADD SUGAR' } : undefined;
  }
  if (take) return at(STATIONS.pickup.cell) ? { verb: 'PICKUP' } : table ? { verb: 'COLLECT', table } : undefined;
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
      event.table = event.tickets.length ? tableForShift(index, level.active_tables) : 0;
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
        ticket.table_id = `T${String(event.table).padStart(2, '0')}`;
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
          });
      }
    }
  let queryFailure = events.find((e) => !e.passed);
  live?.attach({ seed_id: seed, start, duration: Infinity, events: log });
  const fail = (w: Worker, reason: string, line = w.program.source_lines[w.pc] ?? -1) => {
    failure = {
      role: w.role,
      line,
      time: now,
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
  const currentCargo = (w: Worker) =>
    w.role === 'prep' ? (w.inventory.find((c) => c.stage !== 'brewed') ?? w.inventory[0]) : w.inventory[0];
  const currentJob = (w: Worker) =>
    w.role === 'floor' && w.job ? w.job : jobs.find((j) => j.ticketId === currentCargo(w)?.ticketId);
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
      fail(w, `Move to ${name} first: it’s ${tilesAway(w.position, p)} from here.`);
      return false;
    }
    return true;
  };
  /** A Take or Deposit that reached no station: say where this robot's next one belongs. */
  const handMiss = (w: Worker, c: string) => {
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
            : cargo
              ? [tableFront(cargo.table - 1), tableCell(cargo.table), `table ${cargo.table}`]
              : undefined;
    if (!goal)
      return take || w.inventory.length
        ? `There’s nothing for ${ROBOT_DISPLAY_NAMES[w.role]} to ${verb.toLowerCase()} there yet.`
        : `${ROBOT_DISPLAY_NAMES[w.role]} isn’t holding anything to deposit.`;
    const [stand, cell, name] = goal;
    if (!samePoint(w.position, stand)) return `Move to ${name} first: it’s ${tilesAway(w.position, stand)} from here.`;
    const direction = DIRECTIONS.find((d) => samePoint(interactionTarget(stand, d)!, cell))!;
    return `${name[0].toUpperCase() + name.slice(1)} is ${direction === 'UP' ? 'above' : 'below'} ${
      ROBOT_DISPLAY_NAMES[w.role]
    }: use ${verb} ${directionLabel(direction)}.`;
  };
  /** What Store reads: Brew's sugar from the drink it's finishing, Porter's table and place. */
  const storedValue = (w: Worker, source: string): VariableValue | undefined => {
    if (source === 'here') return [w.position[0], w.position[1]];
    if (source === 'table') return currentJob(w)?.table;
    const cup = w.inventory.find((item) => item.stage === 'brewed') ?? currentCargo(w);
    return jobs.find((j) => j.ticketId === cup?.ticketId)?.sugar;
  };
  const capacity = (w: Worker) => (w.role === 'prep' ? config.prepCapacity : config.floorCapacity);
  const condition = (w: Worker, c: string) => {
    const job = currentJob(w);
    const expression = parseConditionExpression(`IF ${c}`);
    if (expression) {
      const tokens = job ? [job.item, ...(job.sugar > 0 ? ['sugar'] : [])] : [];
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
  const canClaimDrink = (j: Job) =>
    j.status === 'ready' && j.event.timing.seated <= now && tableOwners.get(j.table) === j.event.customer.customer_id;
  /** Wait for Orders brings Brew its next ticket and Porter its next ready drink. */
  const isWait = (c: string) => c === 'LISTEN' || c === 'WAIT DIRTY';
  const nextWork = (w: Worker, c: string) =>
    c === 'LISTEN' && w.role === 'prep'
      ? jobs.find((j) => j.status === 'ticket' && j.created <= now)
      : c === 'LISTEN'
        ? jobs.find(canClaimDrink)
        : jobs.find((j) => j.status === 'dirty' && j.dirtyAt <= now);
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
      fail(w, p.compile_error, p.error_line);
      return false;
    }
    if (c === undefined) {
      w.done = true;
      return true;
    }
    if (isWait(c) && !nextWork(w, c)) {
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
      fail(w, 'Instruction limit reached (10,000 per robot).');
      return false;
    }
    if (isMoveCommand(c)) {
      const move = parseMoveCommand(c);
      if (!move) {
        fail(w, `Unknown movement direction: ${c.split(' ')[1]}`, line);
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
        fail(w, `Store a table or a place in ${name} before moving to it.`);
        return false;
      }
      if (typeof value === 'number' && !TABLE_LAYOUT[value - 1]) {
        fail(w, `${name} holds ${value}, and there’s no table ${value}.`);
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
    const stored = parseStore(c);
    if (stored) {
      const value = storedValue(w, stored.value);
      if (value === undefined) {
        fail(w, `Wait for an order before storing its ${stored.value}.`);
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
        fail(w, 'A function can’t call itself.');
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
        fail(w, 'Return only works inside a function that was called.');
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
        fail(w, 'Finish the function before jumping back.');
        return false;
      }
      return control(() => {
        w.pc = p.positions[c.slice(5)];
        w.loops = [];
      });
    }
    if (c === 'END' || c === 'REPEAT') {
      return control(() => {
        w.pc = c === 'REPEAT' ? 0 : w.pc + 1;
        if (c === 'REPEAT') w.loops = [];
      });
    }
    const hand = handAction(w.role, w.position, c);
    if (!hand) {
      fail(w, handMiss(w, c));
      return false;
    }
    const cargo = currentCargo(w),
      job = currentJob(w);
    // The coffee machine picks its step from the cup Brew hands it.
    const a = hand.verb === 'USE' && cargo ? (machineStep(cargo) ?? 'USE') : hand.verb;
    let apply: () => void = () => {},
      seconds = 1;
    if (c === 'LISTEN' && w.role === 'prep') {
      if (!station(w, STATIONS.orders.prep, 'the order handoff')) return false;
      if (w.inventory.length >= capacity(w)) {
        fail(w, 'Brew’s hands are full. Deposit a drink before waiting for another ticket.');
        return false;
      }
      const next = nextWork(w, c)!;
      apply = () => {
        next.status = 'claimed';
        w.inventory.push({ ticketId: next.ticketId, table: next.table, item: next.item, stage: 'claimed', sugar: 0 });
      };
    } else if (isWait(c)) {
      if (w.job) {
        fail(w, 'Finish this delivery or cup before waiting for another.');
        return false;
      }
      const next = nextWork(w, c)!;
      apply = () => {
        w.job = next;
        next.status = 'reserved';
        if (c === 'LISTEN') tableOwners.set(next.table, next.event.customer.customer_id);
      };
    } else if (a === 'PICKUP') {
      if (!w.job || w.job.status !== 'reserved' || w.job.dirtyAt !== Infinity) {
        fail(w, 'Wait for a ready drink before taking one.');
        return false;
      }
      if (w.inventory.length >= capacity(w)) {
        fail(w, 'Tray is full. Serve a carried item first.');
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
    } else if (a === 'SERVE') {
      if (!cargo || cargo.stage !== 'brewed' || !job) {
        fail(w, 'Carry a ready drink before serving.');
        return false;
      }
      if (hand.table !== cargo.table) {
        fail(w, `This drink is for table ${cargo.table}, not table ${hand.table}.`);
        return false;
      }
      if (job.event.timing.seated > now) {
        markWaiting(w, line, c);
        return false;
      }
      apply = () => {
        w.inventory.shift();
        job.status = 'served';
        job.dirtyAt = now + DRINK_SECONDS;
        job.event.timing.served = now;
        const paper = job.event.tickets.find((t) => belongsToPaper(job.ticketId, t))!;
        if (jobs.filter((j) => belongsToPaper(j.ticketId, paper)).every((j) => Number.isFinite(j.dirtyAt)))
          paper.status = 'served';
        const group = jobs.filter((j) => j.event === job.event);
        if (
          group.length === job.event.tickets.reduce((sum, t) => sum + (t.quantity ?? 1), 0) &&
          job.event.tickets.every((ticket) => ticket.status === 'served')
        )
          job.event.timing.left = Math.max(...group.map((served) => served.dirtyAt));
      };
    } else if (a === 'COLLECT') {
      if (!w.job || w.job.dirtyAt > now) {
        fail(w, 'Wait for dirty cups before collecting one.');
        return false;
      }
      if (hand.table !== w.job.table) {
        fail(w, `The dirty cup is on table ${w.job.table}, not table ${hand.table}.`);
        return false;
      }
      if (w.inventory.length >= capacity(w)) {
        fail(w, 'Tray is full. Return cups before collecting another.');
        return false;
      }
      const next = w.job;
      apply = () => {
        w.inventory.push({ ticketId: next.ticketId, table: next.table, item: next.item, stage: 'dirty', sugar: 0 });
        next.status = 'carried';
        w.job = undefined;
      };
    } else if (a === 'RETURN CUPS') {
      if (!cargo || cargo.stage !== 'dirty' || !job) {
        fail(w, 'Carry a used cup before returning it.');
        return false;
      }
      apply = () => {
        w.inventory.shift();
        job.status = 'cleared';
        job.event.timing.cleaned = now;
        if (jobs.filter((j) => j.event === job.event).every((j) => j.status === 'cleared'))
          tableOwners.delete(job.table);
      };
    } else {
      if (!cargo || !job) {
        fail(w, 'Wait for an order ticket before preparing a drink.');
        return false;
      }
      if (a === 'USE') {
        fail(w, machineStepError(cargo));
        return false;
      }
      const recipeCommand = a === 'TAKE' ? (job.item === 'coffee' ? 'TAKE BEANS' : 'TAKE LEAVES') : a;
      const rule = RECIPE_RULES[recipeCommand];
      // Once brewed, sugar and deposit operate on the oldest finished drink.
      const finished = w.inventory.find((item) => item.stage === 'brewed');
      if (a === 'ADD SUGAR' || a === 'DEPOSIT') {
        const ready = finished,
          readyJob = jobs.find((j) => j.ticketId === ready?.ticketId);
        if (!ready || !readyJob) {
          fail(w, 'Finish brewing before taking sugar or depositing.');
          return false;
        }
        if (a === 'ADD SUGAR') {
          // Each Take up at the sugar station drops in one cube.
          if (ready.sugar >= readyJob.sugar) {
            fail(
              w,
              readyJob.sugar
                ? `This ${ready.item} takes ${sugarCount(readyJob.sugar)}, and it already has them.`
                : `This ${ready.item} takes no sugar.`,
            );
            return false;
          }
          apply = () => {
            ready.sugar++;
          };
        } else {
          if (ready.sugar !== readyJob.sugar) {
            fail(w, `This ${ready.item} takes ${sugarCount(readyJob.sugar)}, but it has ${ready.sugar}.`);
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
        if (!rule.previous.includes(cargo.stage) || (rule.item && rule.item !== cargo.item)) {
          fail(w, recipeStepError(recipeCommand, cargo));
          return false;
        }
        seconds = rule.duration ?? 1;
        apply = () => {
          cargo.stage = rule.stage;
        };
      } else {
        fail(w, `Unsupported action: ${c}`);
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
  let transitions = 0;
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
            });
        }
    }
    if (queryFailure && now >= queryFailure.timing.created) {
      const position = log.findLast((e) => e.actor === 'query')?.to ?? STARTS.query;
      failure = {
        role: 'query',
        line: queryFailure.failure_line ?? 0,
        time: now,
        reason: queryFailure.reason ?? 'Order program failed.',
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
      if (
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
    if (
      (!live || live.done()) &&
      finished() &&
      workers.every((w) => !w.pending) &&
      workers.every((w) => !w.move) &&
      now >= intakeFree &&
      (config.objective !== 'serve' ||
        events.every((event) => !event.tickets.length || now >= event.timing.left + STREET_EXIT_SECONDS))
    ) {
      const floor = workers[1],
        loadWorker = number < ROBOT_UNLOCK_LEVELS.floor ? workers[0] : floor;
      if ((config.minLoad ?? 0) > loadWorker.maxLoad) {
        fail(loadWorker, `This shift requires carrying ${config.minLoad} items together.`);
        break;
      } else break;
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
      if (!finished())
        fail(
          workers.find((w) => !w.done) ?? workers[0],
          'Unfinished work: no worker can advance. Check event waits, routes, and repeat instructions.',
        );
      break;
    }
    const next = Math.min(...future);
    yield next;
    now = next;
  }
  if (!failure && (now > SIM_DURATION_SECONDS || transitions >= MAX_TRANSITIONS))
    fail(workers[0], 'Simulation limit reached (3,600 seconds).');
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
