import { BENCH_GUESTS, benchProblems, type BenchGuest, type BenchKit, type BenchOrder } from '@/domain';
import { SAVE_KEY } from '@/features/campaign/save/settings';

/** The benches the player has written, by shift: beside the save and never in it, like the notebook. */
export const BENCH_KEY = `${SAVE_KEY}.bench`;

function readOrder(value: unknown): BenchOrder | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { drink, sugar, toGo, rush } = value as Record<string, unknown>;
  if (drink !== 'coffee' && drink !== 'tea') return undefined;
  if (!(['plain', 'with', 'without'].includes(sugar as string) || Number.isInteger(sugar))) return undefined;
  return { drink, sugar: sugar as BenchOrder['sugar'], ...(toGo === true && { toGo }), ...(rush === true && { rush }) };
}

function readGuest(value: unknown): BenchGuest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { orders, mumbles, after } = value as Record<string, unknown>;
  if (!Array.isArray(orders) || typeof after !== 'number') return undefined;
  const read = orders.map(readOrder);
  if (!read.every(Boolean)) return undefined;
  return { orders: read as BenchOrder[], ...(mumbles === true && { mumbles }), after };
}

function readAll(): Record<string, unknown> {
  try {
    const stored = JSON.parse(localStorage.getItem(BENCH_KEY) ?? '{}') as unknown;
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * The bench kept for a shift, or nothing. One the shift can no longer take, from an older café or changed by hand, is
 * read as nothing, so the bench starts again rather than offering guests it can't run.
 */
export function readBench(levelId: string, kit: BenchKit): BenchGuest[] | undefined {
  const stored = readAll()[levelId];
  if (!Array.isArray(stored) || stored.length > BENCH_GUESTS) return undefined;
  const guests = stored.map(readGuest);
  if (!guests.every(Boolean)) return undefined;
  return benchProblems(kit, guests as BenchGuest[]).length ? undefined : (guests as BenchGuest[]);
}

/** Keep a shift's bench; false when the browser wouldn't, and it lasts until the page closes. */
export function writeBench(levelId: string, guests: readonly BenchGuest[]): boolean {
  try {
    localStorage.setItem(BENCH_KEY, JSON.stringify({ ...readAll(), [levelId]: guests }));
    return true;
  } catch {
    return false;
  }
}
