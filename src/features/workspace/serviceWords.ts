import { useEffect, useRef } from 'react';
import {
  ROBOT_DISPLAY_NAMES,
  heldLabel,
  orderRoute,
  paperLabel,
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
import { crewActivity } from './crew';
import { guestName } from './route';

type Sampled = ReturnType<typeof sampleReplay>;

/** One thing in the café, said in words: who or what it is, and how it stands. */
export interface SummaryLine {
  who: string;
  what: string;
}

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
  stopped?: string;
}

/** Whether a moment of a guest's visit has come by a time; one that hasn't happened yet is not a number. */
const by = (moment: number | null | undefined, local: number) => typeof moment === 'number' && moment <= local;

/** What a guest is having: "coffee", or "drinks" when there are several. */
function drinkOf(guest: ReplayEvent) {
  const cups = guest.tickets.reduce((sum, ticket) => sum + (ticket.quantity ?? 1), 0);
  return cups === 1 ? guest.tickets[0].item || 'drink' : 'drinks';
}

/** How a guest's visit stands at a time, from walking up to heading out. */
export function guestDoing(guest: ReplayEvent, local: number, ordering: boolean): string {
  const { timing, table } = guest;
  const drink = drinkOf(guest);
  const toGo = guest.tickets.length > 0 && guest.tickets.every((ticket) => ticket.to_go);
  if (!by(timing.arrival, local)) return 'Walking up to the café';
  if (by(timing.left, local)) return by(timing.served, local) ? 'Heading out, served' : 'Heading out';
  if (by(timing.served, local))
    return toGo ? `Leaving with their ${drink}` : `Drinking their ${drink} at table ${table}`;
  if (!by(timing.created, local)) return ordering ? 'Ordering at the register' : 'In line to order';
  if (toGo) return `Waiting for their ${drink} to go`;
  if (by(timing.seated, local)) return `At table ${table}, waiting for their ${drink}`;
  if (by(timing.seating, local)) return `Walking to table ${table}`;
  return 'Waiting for a table';
}

/** A robot as the café names it: a stand-in by its own name. */
const robotName = (role: RobotRole, shift: number) =>
  role === 'query' ? ROBOT_DISPLAY_NAMES.query : robotActorName(role, shift);

/** A robot stopping the run: "Brew stopped: there is no cup to fill". */
const stoppedWords = (event: ExecutionEvent, shift: number) =>
  `${event.actor === 'niko' ? 'Niko' : robotName(event.role, shift)} stopped: ${event.error!.replace(/\.$/, '')}`;

/** Tickets or cups on a counter, by what they are, the same ones counted together: "coffee, 2 tea to go". */
function itemsWords(items: readonly { item: string; toGo?: boolean; quantity?: number }[]) {
  const counted = new Map<string, number>();
  for (const { item, toGo, quantity = 1 } of items) {
    const label = `${item}${toGo ? ' to go' : ''}`;
    counted.set(label, (counted.get(label) ?? 0) + quantity);
  }
  return counted.size ? [...counted].map(([label, n]) => `${n > 1 ? `${n} ` : ''}${label}`).join(', ') : 'None';
}

const ticketItems = (tickets: readonly OrderTicket[]) =>
  tickets.map((ticket) => ({ item: ticket.item || 'drink', toGo: !!ticket.to_go, quantity: ticket.quantity }));

/** The café at the sampled moment of a run, in words. */
export function summarize(result: RunResult, sampled: Sampled, level: LevelDefinition, shift: number): ServiceSummary {
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
    who: `${guestName(level, guest)} · “${guest.customer.phrase}”`,
    what: guestDoing(guest, local, guest === next),
  }));
  const activity = crewActivity(sampled);
  const crew = (['query', 'prep', 'floor'] as const).flatMap((role) => {
    const actor = sampled.actors[role];
    const doing = activity[role];
    if (!actor || !doing) return [];
    const holding = [...(actor.heldPaper ? [paperLabel(actor.heldPaper)] : []), ...actor.inventory.map(heldLabel)];
    return [
      { who: robotName(role, shift), what: doing.label + (holding.length ? `; carrying ${holding.join(', ')}` : '') },
    ];
  });
  const counters = [
    { who: `Tickets for ${robotName('prep', shift)}`, what: itemsWords(ticketItems(sampled.waitingTickets)) },
    { who: 'Ready at pickup', what: itemsWords(sampled.pickup.map(([, drink]) => drink)) },
  ];
  if (level.service?.clearing ?? true)
    counters.push({
      who: 'Left on the tables',
      what: sampled.tableDrinks.length
        ? sampled.tableDrinks.map((cup) => `${cup.item} at table ${cup.table}`).join(', ')
        : 'None',
    });
  const slip = sampled.seed?.events.find((event) => event.error && event.start <= local);
  const seed = level.seeds.find((s) => s.id === seedId);
  return {
    guests,
    served: round.filter((guest) => by(guest.timing.served, local)).length,
    total: seed?.customers.length ?? round.length,
    crew,
    counters,
    ...(slip && { stopped: `${stoppedWords(slip, shift)}.` }),
  };
}

/** How many happenings one announcement names before it counts the rest. */
const SAID = 3;

/**
 * What happened in a run between two times, in a sentence or two for a screen reader: a round beginning, a guest
 * walking in, being served or leaving, a robot stopping. The legs of the guests' orders are the ones the order card
 * shows, so the two always agree. Nothing is said for the many small steps in between.
 */
export function happenings(result: RunResult, level: LevelDefinition, shift: number, from: number, to: number): string {
  const said: { at: number; words: string }[] = [];
  for (const [i, round] of (result.execution ?? []).entries()) {
    if (round.start > to || round.start + round.duration <= from) continue;
    if (i > 0 && round.start > from && round.start <= to)
      said.push({ at: round.start, words: `Round ${i + 1} of ${level.seeds.length} begins` });
    for (const guest of result.events) {
      if (guest.seed_id !== round.seed_id || round.start + guest.timing.arrival > to) continue;
      const name = guestName(level, guest);
      for (const leg of orderRoute(result, guest, to)) {
        const at = leg.stage === 'serve' ? leg.end : leg.at;
        if (at <= from || at > to) continue;
        if (leg.stage === 'arrive') said.push({ at, words: `${name} walks in` });
        else if (leg.stage === 'serve')
          said.push({
            at,
            words: leg.toGo
              ? `${name} gets ${leg.cup ? `the ${leg.cup}` : `their ${drinkOf(guest)}`} to go`
              : `${name} is served ${leg.cup ? `the ${leg.cup} ` : ''}at table ${guest.table}`,
          });
        else if (leg.stage === 'leave') said.push({ at, words: `${name} leaves` });
      }
    }
    for (const event of round.events) {
      const at = round.start + event.start;
      if (event.error && at > from && at <= to) said.push({ at, words: stoppedWords(event, shift) });
    }
  }
  said.sort((a, b) => a.at - b.at);
  // A robot stopping is the one thing never left uncounted.
  const slip = said.findIndex((s) => / stopped: /.test(s.words));
  const shown = said.length <= SAID + 1 ? said : said.slice(0, SAID);
  if (slip >= shown.length) shown.push(said[slip]);
  const rest = said.length - shown.length;
  return [...shown.map((s) => `${s.words}.`), ...(rest > 0 ? [`And ${rest} more.`] : [])].join(' ');
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
    const words = happenings(result, level, shift, told.current, head);
    told.current = head;
    if (words) announce(words);
  }, [on, result, head, playing]);
  return on ? said : '';
}
