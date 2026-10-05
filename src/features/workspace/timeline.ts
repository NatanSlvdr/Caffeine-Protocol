import { ROBOT_DISPLAY_NAMES, type Moment, type RobotPrograms, type RobotRole } from '@/domain';
import { startedWords } from './inspector';

/** What the timeline jumps between: the run's big moments, one kind of them, or every start of one robot's. */
export type JumpFilter = 'all' | 'order' | 'handoff' | RobotRole;

/** Two moments closer than this are one place on the timeline. */
const SAME = 1e-3;

/**
 * The moments a filter jumps between. The big ones are every order, every slip, and each handoff the player's robots
 * make; a robot's are every block and wait it starts. Moments a stand-in covers, beyond the orders, stay off it.
 */
export function jumpTargets(moments: readonly Moment[], filter: JumpFilter, crew: readonly RobotRole[]): Moment[] {
  const ours = (m: Moment) => m.event.actor !== 'niko' && crew.includes(m.event.role);
  return moments.filter((m) =>
    filter === 'all'
      ? m.kind === 'order' || m.kind === 'slip' || (m.kind === 'handoff' && ours(m))
      : filter === 'order' || filter === 'handoff'
        ? m.kind === filter && (filter === 'order' || ours(m))
        : m.event.role === filter && ours(m),
  );
}

/** The moment just before a time, or just after it, skipping any at the time itself. */
export function nextMoment(targets: readonly Moment[], time: number, direction: -1 | 1): Moment | undefined {
  return direction > 0 ? targets.find((m) => m.at > time + SAME) : targets.findLast((m) => m.at < time - SAME);
}

/**
 * Where to look to see a moment: a hair after it, so the block it starts is the one on screen rather than the one
 * before, however the round's start and the block's time add up.
 */
export const landOn = (moment: Moment) => moment.at + SAME / 10;

/** Every moment at the same place on the timeline as one, said together. */
export const momentsAt = (moments: readonly Moment[], at: number) => moments.filter((m) => Math.abs(m.at - at) < SAME);

/**
 * A moment in a few words, for a screen reader and a tick's title: "Query takes an order: “tea, 1 sugar”", "Brew takes
 * a ticket", "Porter stopped: …", "Brew: take up, block 8."
 */
export function momentWords(moment: Moment, programs: RobotPrograms, textMode: boolean): string {
  const { event } = moment;
  const who = event.actor === 'niko' ? 'Niko' : ROBOT_DISPLAY_NAMES[event.role];
  if (moment.kind === 'order')
    return event.customerId === 'CLOSING'
      ? 'The closing-time call'
      : `${who} takes an order${moment.guest ? `: “${moment.guest.customer.phrase}”` : ''}`;
  if (moment.kind === 'handoff') return `${who} takes a ${event.role === 'prep' ? 'ticket' : 'drink'}`;
  if (moment.kind === 'slip') return `${who} stopped: ${event.error?.replace(/\.$/, '')}`;
  return startedWords([event], [event.role], programs, textMode).replace(/\.$/, '');
}

/** When a moment of the run was: the round, if the shift has more than one, and the time into it. */
export const whenWords = (rounds: number, round: number, local: number) =>
  (rounds > 1 ? `Round ${round} · ` : '') + (local < 0 ? 'Before opening' : `${local.toFixed(1)} s`);
