import { useEffect, useRef } from 'react';
import {
  ROBOT_DISPLAY_NAMES,
  orderRoute,
  robotActorName,
  type ExecutionEvent,
  type LevelDefinition,
  type OrderTicket,
  type ReplayEvent,
  type RobotRole,
  type RunResult,
  type sampleReplay,
} from '@/domain';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { CARGO_WORDS, type CargoWords } from '@/components';
import { crewActivity } from './crew';
import { PAUSE_WORDS, type PauseWords } from './pauseWords';
import { ROUTE_WORDS, type RouteWords } from './routeWords';
import { SUMMARY_WORDS, type SummaryWords } from './summaryWords';
import { guestName } from './route';

type Sampled = ReturnType<typeof sampleReplay>;

/** One thing in the café, said in words: who or what it is, and how it stands. */
export interface SummaryLine {
  who: string;
  /** What a guest said, in English as the routine heard it. */
  said?: string;
  what: string;
}

/** A robot that stopped the run, and why, in the simulation's English. */
export interface Stopped {
  who: string;
  error: string;
}

/** The words the café is told in: the summary's own, a robot's doing, what it carries, a guest's name and cups. */
export interface ServiceSay {
  summary: SummaryWords;
  pause: PauseWords;
  cargo: CargoWords;
  route: RouteWords;
}

const ENGLISH: ServiceSay = {
  summary: SUMMARY_WORDS.en,
  pause: PAUSE_WORDS.en,
  cargo: CARGO_WORDS.en,
  route: ROUTE_WORDS.en,
};

/**
 * The café at one moment of a service, in words, for anyone the 3D scene doesn't reach: every guest in it and how
 * their order stands, what each robot is doing and carrying, what waits on the counters, and what stopped the run.
 * All of it is read from the run's records at that moment, the same ones the scene is drawn from.
 */
export interface ServiceSummary {
  guests: SummaryLine[];
  /** Guests of this round served so far, of how many it has. */
  served: number;
  total: number;
  crew: SummaryLine[];
  counters: SummaryLine[];
  /** What stopped the run, once it has. */
  stopped?: Stopped;
}

/** Whether a moment of a guest's visit has come by a time; one that hasn't happened yet is not a number. */
const by = (moment: number | null | undefined, local: number) => typeof moment === 'number' && moment <= local;

/** What a guest is having: "coffee", empty while it isn't known, or "drinks" when there are several. */
function drinkOf(guest: ReplayEvent) {
  const cups = guest.tickets.reduce((sum, ticket) => sum + (ticket.quantity ?? 1), 0);
  return cups === 1 ? guest.tickets[0].item : 'drinks';
}

/** How a guest's visit stands at a time, from walking up to heading out. */
export function guestDoing(
  guest: ReplayEvent,
  local: number,
  ordering: boolean,
  say: SummaryWords['visit'] = SUMMARY_WORDS.en.visit,
): string {
  const { timing, table } = guest;
  const drink = drinkOf(guest);
  const toGo = guest.tickets.length > 0 && guest.tickets.every((ticket) => ticket.to_go);
  if (!by(timing.arrival, local)) return say.walkingUp;
  if (by(timing.left, local)) return by(timing.served, local) ? say.outServed : say.out;
  if (by(timing.served, local)) return toGo ? say.leaving(drink) : say.drinking(table, drink);
  if (!by(timing.created, local)) return ordering ? say.ordering : say.inLine;
  if (toGo) return say.toGo(drink);
  if (by(timing.seated, local)) return say.seated(table, drink);
  if (by(timing.seating, local)) return say.walkingTo(table);
  return say.waitingTable;
}

/** A robot as the café names it: a stand-in by its own name. */
const robotName = (role: RobotRole, shift: number) =>
  role === 'query' ? ROBOT_DISPLAY_NAMES.query : robotActorName(role, shift);

/** A robot stopping the run: Brew, and "there is no cup to fill". */
const stoppedBy = (event: ExecutionEvent, shift: number): Stopped => ({
  who: event.actor === 'niko' ? 'Niko' : robotName(event.role, shift),
  error: event.error!.replace(/\.$/, ''),
});

/** Tickets or cups on a counter, by what they are, the same ones counted together: "coffee, 2 tea to go". */
function itemsWords(items: readonly { item: string; toGo?: boolean; quantity?: number }[], say: SummaryWords) {
  const counted = new Map<string, { item: string; toGo: boolean; n: number }>();
  for (const { item, toGo = false, quantity = 1 } of items) {
    const key = `${item}${toGo ? ' to go' : ''}`;
    const kind = counted.get(key) ?? { item, toGo, n: 0 };
    counted.set(key, { ...kind, n: kind.n + quantity });
  }
  return counted.size
    ? [...counted.values()].map(({ item, toGo, n }) => say.items(item, toGo, n)).join(', ')
    : say.none;
}

const ticketItems = (tickets: readonly OrderTicket[]) =>
  tickets.map((ticket) => ({ item: ticket.item, toGo: !!ticket.to_go, quantity: ticket.quantity }));

/** The café at the sampled moment of a run, in words. */
export function summarize(
  result: RunResult,
  sampled: Sampled,
  level: LevelDefinition,
  shift: number,
  { summary: say, pause, cargo, route }: ServiceSay = ENGLISH,
): ServiceSummary {
  const local = sampled.local;
  const seedId = sampled.seed?.seed_id;
  const round = result.events.filter((event) => event.seed_id === seedId);
  const present = new Set(sampled.customers.map((customer) => customer.id));
  const here = round
    .filter((guest) => present.has(guest.customer.customer_id))
    .sort((a, b) => a.timing.arrival - b.timing.arrival);
  // Guests order one at a time, in the order they came: the first still to order is at the register.
  const next = here.find((guest) => by(guest.timing.arrival, local) && !by(guest.timing.created, local));
  const guests = here.map((guest) => ({
    who: guestName(level, guest, route.guest),
    said: guest.customer.phrase,
    what: guestDoing(guest, local, guest === next, say.visit),
  }));
  const activity = crewActivity(sampled, pause);
  const crew = (['query', 'prep', 'floor'] as const).flatMap((role) => {
    const actor = sampled.actors[role];
    const doing = activity[role];
    if (!actor || !doing) return [];
    const holding = [...(actor.heldPaper ? [cargo.paper(actor.heldPaper)] : []), ...actor.inventory.map(cargo.held)];
    return [
      { who: robotName(role, shift), what: doing.label + (holding.length ? say.carrying(holding.join(', ')) : '') },
    ];
  });
  const counters = [
    { who: say.ticketsFor(robotName('prep', shift)), what: itemsWords(ticketItems(sampled.waitingTickets), say) },
    {
      who: say.pickup,
      what: itemsWords(
        sampled.pickup.map(([, drink]) => drink),
        say,
      ),
    },
  ];
  if (level.service?.clearing ?? true)
    counters.push({
      who: say.tables,
      what: sampled.tableDrinks.length
        ? sampled.tableDrinks.map((cup) => say.onTable(cup.item, cup.table)).join(', ')
        : say.none,
    });
  const slip = sampled.seed?.events.find((event) => event.error && event.start <= local);
  const seed = level.seeds.find((s) => s.id === seedId);
  return {
    guests,
    served: round.filter((guest) => by(guest.timing.served, local)).length,
    total: seed?.customers.length ?? round.length,
    crew,
    counters,
    ...(slip && { stopped: stoppedBy(slip, shift) }),
  };
}

/** How many happenings one announcement names before it counts the rest. */
const SAID = 3;

/**
 * What happened in a run between two times, in a sentence or two for a screen reader: a round beginning, a guest
 * walking in, being served or leaving, a robot stopping. The legs of the guests' orders are the ones the order card
 * shows, so the two always agree. Nothing is said for the many small steps in between.
 */
export function happenings(
  result: RunResult,
  level: LevelDefinition,
  shift: number,
  from: number,
  to: number,
  { summary: say, route }: ServiceSay = ENGLISH,
): string {
  const said: { at: number; words: string; slip?: boolean }[] = [];
  for (const [i, round] of (result.execution ?? []).entries()) {
    if (round.start > to || round.start + round.duration <= from) continue;
    if (i > 0 && round.start > from && round.start <= to)
      said.push({ at: round.start, words: say.begins(i + 1, level.seeds.length) });
    for (const guest of result.events) {
      if (guest.seed_id !== round.seed_id || round.start + guest.timing.arrival > to) continue;
      const name = guestName(level, guest, route.guest);
      for (const leg of orderRoute(result, guest, to)) {
        const at = leg.stage === 'serve' ? leg.end : leg.at;
        if (at <= from || at > to) continue;
        const cup = leg.cup && route.cup(leg.cup);
        if (leg.stage === 'arrive') said.push({ at, words: say.walksIn(name) });
        else if (leg.stage === 'serve')
          said.push({
            at,
            words: leg.toGo ? say.toGo(name, drinkOf(guest), cup) : say.served(name, guest.table, drinkOf(guest), cup),
          });
        else if (leg.stage === 'leave') said.push({ at, words: say.leaves(name) });
      }
    }
    for (const event of round.events) {
      const at = round.start + event.start;
      if (!event.error || at <= from || at > to) continue;
      const { who, error } = stoppedBy(event, shift);
      said.push({ at, words: route.stopped(who) + error, slip: true });
    }
  }
  said.sort((a, b) => a.at - b.at);
  // A robot stopping is the one thing never left uncounted.
  const slip = said.findIndex((s) => s.slip);
  const shown = said.length <= SAID + 1 ? said : said.slice(0, SAID);
  if (slip >= shown.length) shown.push(said[slip]);
  const rest = said.length - shown.length;
  return [...shown.map((s) => `${s.words}.`), ...(rest > 0 ? [say.more(rest)] : [])].join(' ');
}

/**
 * What a screen reader hears of a service while the café is told in words: what happened since it last spoke, said
 * at most every second and a half of play, and at once when the service stops, pauses or steps. Looking back through
 * the run says nothing; the run picks up from where it had got to.
 */
export function useServiceAnnouncements({
  on,
  result,
  level,
  shift,
  head,
  playing,
  speed,
  say,
}: {
  on: boolean;
  result: RunResult | null;
  level: LevelDefinition;
  shift: number;
  /** How far the run has got. */
  head: number;
  /** Whether the service is playing on, rather than paused or over. */
  playing: boolean;
  speed: number;
  say: ServiceSay;
}): string {
  const [said, announce] = useAnnouncement();
  // How far the run had got when it was last told; nothing before a run is told from its start.
  const told = useRef<number | null>(null);
  useEffect(() => {
    if (!on || !result) {
      told.current = null;
      return;
    }
    // Turned on partway, or a new run started: told from here on.
    if (told.current === null || head < told.current) {
      told.current = head;
      return;
    }
    if (playing && head - told.current < Math.max(1, speed * 1.5)) return;
    if (head === told.current) return;
    const words = happenings(result, level, shift, told.current, head, say);
    told.current = head;
    if (words) announce(words);
  }, [on, result, head, playing]);
  return on ? said : '';
}
