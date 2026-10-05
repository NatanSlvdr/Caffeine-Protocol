import type { ReplayEvent } from '@/domain';

/** The parts of a guest's wait, from walking in to having every drink. */
export type WaitStage = 'ordering' | 'making' | 'seating' | 'clearing' | 'delivery';

export const WAIT_LABELS: Record<WaitStage, string> = {
  ordering: 'Ordering',
  making: 'Making drinks',
  seating: 'Finding a table',
  clearing: 'Clearing a table',
  delivery: 'Carrying drinks out',
};

/** What held guests up most, said once on the receipt. */
export const WAIT_LEADS: Record<WaitStage, string> = {
  ordering: 'Most of the guests’ wait was in line to order.',
  making: 'Most of the guests’ wait was for their drinks to be made.',
  seating: 'Most of the guests’ wait was for a free table.',
  clearing: 'Most of the guests’ wait was for a table to be cleared.',
  delivery: 'Most of the guests’ wait was for ready drinks to be carried out.',
};

export interface WaitShare {
  stage: WaitStage;
  seconds: number;
  /** Of every guest's wait together, rounded to a whole percent. */
  percent: number;
}

/**
 * Where the guests' time went, read from the service's own timestamps and table reservations rather than how the
 * animation looked: largest first, leaving out parts nobody waited on. A drink and a seat are got ready side by side,
 * so the later of the two holds the guest up: the time until it goes to the drinks being made or to the table, not
 * both. A table the guest waits for is still taken until its last guest leaves, and is being cleared after that.
 */
export function guestWaits(events: readonly ReplayEvent[]): WaitShare[] {
  const totals: Record<WaitStage, number> = { ordering: 0, making: 0, seating: 0, clearing: 0, delivery: 0 };
  const seatingOf = (event: ReplayEvent) => event.timing.seating ?? event.timing.created;
  const span = (from: number, to: number) => Math.max(0, to - from);
  for (const event of events) {
    const { arrival, created, ready, seated, served } = event.timing;
    if (!event.tickets.length || ![arrival, created, ready, seated, served].every(Number.isFinite)) continue;
    totals.ordering += span(arrival, created);
    if (ready >= seated) totals.making += span(created, ready);
    else {
      const seating = seatingOf(event);
      // The guest before at this table, who had to leave and have their cups cleared before this one could sit.
      const before = event.table
        ? events
            .filter(
              (other) => other.seed_id === event.seed_id && other.table === event.table && seatingOf(other) < seating,
            )
            .reduce<ReplayEvent | undefined>(
              (latest, other) => (!latest || seatingOf(other) > seatingOf(latest) ? other : latest),
              undefined,
            )
        : undefined;
      const left = Math.min(Math.max(before?.timing.left ?? seating, created), seating);
      totals.seating += span(created, left) + span(seating, seated);
      totals.clearing += span(left, seating);
    }
    totals.delivery += span(Math.max(ready, seated), served);
  }
  const whole = Object.values(totals).reduce((sum, seconds) => sum + seconds, 0);
  if (!whole) return [];
  const shares = (Object.entries(totals) as [WaitStage, number][])
    .map(([stage, seconds]) => ({ stage, seconds, percent: Math.floor((seconds / whole) * 100) }))
    .sort((a, b) => b.seconds - a.seconds);
  // The percents left over by rounding down go to the largest remainders, so the shares add up to 100.
  const remainder = (share: WaitShare) => (share.seconds / whole) * 100 - share.percent;
  const short = 100 - shares.reduce((sum, share) => sum + share.percent, 0);
  for (const share of [...shares].sort((a, b) => remainder(b) - remainder(a)).slice(0, short)) share.percent++;
  return shares.filter((share) => share.percent > 0);
}
