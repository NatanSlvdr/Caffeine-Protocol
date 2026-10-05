import {
  ROBOT_DISPLAY_NAMES,
  belongsToPaper,
  count,
  heldLabel,
  paneRow,
  paperLabel,
  placeLabel,
  spokenBlock,
  ticketSugar,
  variableLabels,
} from '@/domain';
import type {
  ExecutionEvent,
  HeardOrder,
  OrderTicket,
  RobotPrograms,
  RobotRole,
  RunResult,
  VariableValue,
  WaitReason,
  sampleReplay,
} from '@/domain';

/** What a robot waits for, said as the robot tab and the inspector say it. */
export const WAIT_LABELS: Record<WaitReason, string> = {
  guest: 'Waiting for a guest',
  ticket: 'Waiting for a ticket',
  drink: 'Waiting for a drink to be ready',
  'used-cup': 'Waiting for a used cup',
  'cup-to-wash': 'Waiting for a used cup to wash',
  seated: 'Waiting for the guest to sit down',
};

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
  holding: string[];
  memory: MemorySlot[];
  loop?: string;
}

const TOKEN_WORDS: Record<string, string> = { togo: 'to go' };
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Query's For item lap, in the words Query heard: "coffee, sugar, number 2". */
const heardWords = (item: HeardOrder) =>
  item.tokens
    .map((token) =>
      token === 'number' && item.number !== undefined ? `number ${item.number}` : (TOKEN_WORDS[token] ?? token),
    )
    .join(', ');

const valueWords = (value: VariableValue) => (typeof value === 'number' ? String(value) : placeLabel(value));

/** A ticket as Brew or Porter reads it: where it goes, the drink, its sugar, and its marks. */
export const ticketWords = (ticket: OrderTicket) =>
  [
    ticket.to_go ? 'To go' : ticket.table_id ? `Table ${Number(ticket.table_id.slice(1))}` : undefined,
    ticket.item ? capital(ticket.item) : undefined,
    count(ticketSugar(ticket), 'sugar'),
    ticket.rush ? 'Rush' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Where a line of a routine is, as the code pane numbers it: "Block 7", or "Line 9" in the text view. An End is the
 * bottom of the block that opens its group.
 */
export function placeOf(source: string, line: number, textMode: boolean): string {
  const row = textMode ? undefined : paneRow(source, line);
  return row ? `Block ${row.ordinal}` : `Line ${line + 1}`;
}

/** What a block does, said the way the editor reads it out; an End is the end of the block that opens its group. */
function blockWords(command: string, source: string, line: number) {
  if (command !== 'END') return spokenBlock(command);
  const row = paneRow(source, line);
  return row?.closes ? `end of ${spokenBlock(row.block.command)}` : 'end';
}

/** The memory slots a routine uses, Var A first. */
const slotsIn = (source: string) => [...new Set(source.match(/\bvar[1-4]\b/g) ?? [])].sort();

function orderOf(role: RobotRole, last: ExecutionEvent | undefined, result: RunResult, seed: string) {
  if (!last) return undefined;
  if (role === 'query') {
    if (!last.customerId) return undefined;
    if (last.customerId === 'CLOSING') return 'The closing-time call';
    const guest = result.events.find((e) => e.seed_id === seed && e.customer.customer_id === last.customerId);
    return guest && `“${guest.customer.phrase}”`;
  }
  const ticket = last.ticketId && result.tickets.find((paper) => belongsToPaper(last.ticketId!, paper));
  return ticket ? ticketWords(ticket) : undefined;
}

/** The open robot at the sampled moment; nothing when the robot isn't in the café. */
export function inspectRobot(
  result: RunResult,
  sampled: ReturnType<typeof sampleReplay>,
  role: RobotRole,
  source: string,
  textMode: boolean,
): RobotState | undefined {
  const actor = sampled.actors[role];
  if (!actor) return undefined;
  const last = sampled.seed?.events.findLast((e) => e.actor === role && e.start <= sampled.local && !e.error);
  const action = actor.action,
    stopped = last?.command === 'STOP' && last.end <= sampled.local;
  const doing = action?.waiting
    ? WAIT_LABELS[action.waiting]
    : stopped
      ? 'Stopped for the night'
      : !last
        ? 'Waiting for the doors to open'
        : capital(blockWords(action?.command ?? last.command, source, last.line));
  const loop = actor.loop;
  return {
    robot: ROBOT_DISPLAY_NAMES[role],
    doing,
    at: last && !stopped ? placeOf(source, last.line, textMode) : undefined,
    order: orderOf(role, last, result, sampled.seed?.seed_id ?? ''),
    holding: [...(actor.heldPaper ? [paperLabel(actor.heldPaper)] : []), ...actor.inventory.map(heldLabel)],
    memory: slotsIn(source).map((slot) => {
      const value = actor.variables?.[slot];
      return { name: variableLabels(slot), ...(value !== undefined && { value: valueWords(value) }) };
    }),
    loop:
      loop &&
      (loop.item
        ? `Item ${loop.pass} of ${loop.passes}: ${heardWords(loop.item)}`
        : `Lap ${loop.pass} of ${loop.passes}`) + ` · ${placeOf(source, loop.line, textMode).toLowerCase()}`,
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
): string {
  const told = started.filter((event) => event.actor !== 'niko' && crew.includes(event.role));
  if (!told.length) return 'Service paused.';
  return told
    .map((event) => {
      const who = ROBOT_DISPLAY_NAMES[event.role];
      if (event.error) return `${who} stopped: ${event.error}`;
      const source = programs[event.role];
      const what = event.waiting
        ? WAIT_LABELS[event.waiting].toLowerCase()
        : blockWords(event.command, source, event.line);
      return `${who}: ${what}, ${placeOf(source, event.line, textMode).toLowerCase()}.`;
    })
    .join(' ');
}
