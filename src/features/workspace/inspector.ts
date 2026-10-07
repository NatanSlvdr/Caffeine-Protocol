import {
  ROBOT_DISPLAY_NAMES,
  belongsToPaper,
  paneRow,
  spokenBlock,
  ticketSugar,
  variableLabels,
  warmDrinks,
} from '@/domain';
import type {
  ExecutionEvent,
  HeardOrder,
  OrderTicket,
  RobotPrograms,
  RobotRole,
  RunResult,
  VariableValue,
  sampleReplay,
} from '@/domain';
import { CARGO_WORDS } from '@/components';
import { PAUSE_WORDS, type PauseWords } from './pauseWords';

/** One of the robot's memory slots its routine uses, and what it holds; nothing when it is not set. */
export interface MemorySlot {
  name: string;
  value?: string;
}

/**
 * One robot at the moment the service is paused on, all of it read from the run's records: what it is doing, the
 * guest or ticket it is on, what it carries, what its memory holds, and its place in a For loop. What it knows is as
 * of its last finished block, the moment the block on screen started. Anything the records don't hold is left out
 * rather than guessed: a memory slot with nothing stored says so.
 */
export interface RobotState {
  robot: string;
  doing: string;
  /** Where the block it is on or waiting at sits, as the code pane numbers it: "Block 7", or "Line 9" in the text view. */
  at?: string;
  /** For Query, what the guest it is serving said; for Brew and Porter, the ticket the block is for. */
  order?: string;
  /** The order is what the guest said, in their own words. */
  said?: boolean;
  holding: string[];
  memory: MemorySlot[];
  loop?: string;
  /**
   * On a shift where drinks go cold, for Porter: each drink at pickup or on its tray, with the seconds it has left,
   * the coldest first. Missing on any other shift.
   */
  warm?: string[];
}

const TOKEN_WORDS: Record<string, string> = { togo: 'to go' };
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Query's For item lap, in the words Query heard: "coffee, sugar, number 2". */
const heardWords = (item: HeardOrder) =>
  item.tokens
    .map((token) =>
      token === 'number' && item.number !== undefined ? `number ${item.number}` : (TOKEN_WORDS[token] ?? token),
    )
    .join(', ');

/** A ticket as Brew or Porter reads it: where it goes, the drink, its sugar, and its marks. */
export const ticketWords = (ticket: OrderTicket, say: PauseWords['ticket'] = PAUSE_WORDS.en.ticket) =>
  [
    ticket.to_go ? say.toGo : ticket.table_id ? say.table(Number(ticket.table_id.slice(1))) : undefined,
    ticket.item ? say.drink(ticket.item) : undefined,
    say.sugars(ticketSugar(ticket)),
    ticket.rush ? say.rush : undefined,
    ticket.together ? say.together : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Where a line of a routine is, as the code pane numbers it: "Block 7", or "Line 9" in the text view. An End is the
 * bottom of the block that opens its group.
 */
function placeOf(source: string, line: number, textMode: boolean, say: PauseWords): string {
  const row = textMode ? undefined : paneRow(source, line);
  return row ? say.block(row.ordinal) : say.line(line + 1);
}

/**
 * What a block does, said the way the editor reads it out, capitalised; an End is the end of the block that opens its
 * group.
 */
function blockWords(command: string, source: string, line: number, say: PauseWords) {
  if (command !== 'END') return say.doing(spokenBlock(command));
  const row = paneRow(source, line);
  return row?.closes ? say.endOf(spokenBlock(row.block.command)) : say.end;
}

/** The memory slots a routine uses, Var A first. */
const slotsIn = (source: string) => [...new Set(source.match(/\bvar[1-4]\b/g) ?? [])].sort();

function orderOf(
  role: RobotRole,
  last: ExecutionEvent | undefined,
  result: RunResult,
  seed: string,
  say: PauseWords,
): Pick<RobotState, 'order' | 'said'> {
  if (!last) return {};
  if (role === 'query') {
    if (!last.customerId) return {};
    if (last.customerId === 'CLOSING') return { order: say.closingCall };
    const guest = result.events.find((e) => e.seed_id === seed && e.customer.customer_id === last.customerId);
    return guest ? { order: `“${guest.customer.phrase}”`, said: true } : {};
  }
  const ticket = last.ticketId && result.tickets.find((paper) => belongsToPaper(last.ticketId!, paper));
  return ticket ? { order: ticketWords(ticket, say.ticket) } : {};
}

/** A drink keeping warm, as Porter's inspector lists it: "Tea · Table 3 · At pickup · 12 s left". */
const warmWords = (drink: ReturnType<typeof warmDrinks>[number], say: PauseWords['ticket']) =>
  [
    say.drink(drink.item),
    drink.table ? say.table(drink.table) : say.toGo,
    drink.carried ? say.tray : say.pickup,
    say.left(Math.max(0, Math.ceil(drink.left))),
  ].join(' · ');

/**
 * The open robot at the sampled moment; nothing when the robot isn't in the café. On a shift where a drink goes cold
 * `fresh` seconds after reaching pickup, Porter's state lists the drinks keeping warm.
 */
export function inspectRobot(
  result: RunResult,
  sampled: ReturnType<typeof sampleReplay>,
  role: RobotRole,
  source: string,
  textMode: boolean,
  fresh?: number,
  say: PauseWords = PAUSE_WORDS.en,
  cargo = CARGO_WORDS.en,
): RobotState | undefined {
  const actor = sampled.actors[role];
  if (!actor) return undefined;
  const last = sampled.seed?.events.findLast((e) => e.actor === role && e.start <= sampled.local && !e.error);
  const action = actor.action,
    stopped = last?.command === 'STOP' && last.end <= sampled.local;
  const doing = action?.waiting
    ? say.waits[action.waiting]
    : stopped
      ? say.stopped
      : !last
        ? say.doors
        : blockWords(action?.command ?? last.command, source, last.line, say);
  const loop = actor.loop;
  const valueWords = (value: VariableValue) => (typeof value === 'number' ? String(value) : cargo.place(value));
  return {
    robot: ROBOT_DISPLAY_NAMES[role],
    doing,
    at: last && !stopped ? placeOf(source, last.line, textMode, say) : undefined,
    ...orderOf(role, last, result, sampled.seed?.seed_id ?? '', say),
    holding: [...(actor.heldPaper ? [cargo.paper(actor.heldPaper)] : []), ...actor.inventory.map(cargo.held)],
    memory: slotsIn(source).map((slot) => {
      const value = actor.variables?.[slot];
      return { name: variableLabels(slot), ...(value !== undefined && { value: valueWords(value) }) };
    }),
    loop:
      loop &&
      (loop.item
        ? say.inspector.item(loop.pass, loop.passes, heardWords(loop.item))
        : say.inspector.lap(loop.pass, loop.passes)) + ` · ${lower(placeOf(source, loop.line, textMode, say))}`,
    ...(role === 'floor' &&
      fresh !== undefined && {
        warm: warmDrinks(sampled.seed?.events ?? [], result.tickets, sampled.local, fresh).map((drink) =>
          warmWords(drink, say.ticket),
        ),
      }),
  };
}

/**
 * What a step stopped on, for a screen reader: "Query: waiting for a guest, block 2. Brew: take up, block 8." Only the
 * crew the player writes routines for is told.
 */
export function startedWords(
  started: readonly ExecutionEvent[],
  crew: readonly RobotRole[],
  programs: RobotPrograms,
  textMode: boolean,
  say: PauseWords = PAUSE_WORDS.en,
): string {
  const told = started.filter((event) => event.actor !== 'niko' && crew.includes(event.role));
  if (!told.length) return say.started.none;
  return told
    .map((event) => {
      const who = ROBOT_DISPLAY_NAMES[event.role];
      if (event.error) return say.started.stopped(who, event.error);
      const source = programs[event.role];
      const what = lower(event.waiting ? say.waits[event.waiting] : blockWords(event.command, source, event.line, say));
      return say.started.step(who, what, lower(placeOf(source, event.line, textMode, say)));
    })
    .join(' ');
}
