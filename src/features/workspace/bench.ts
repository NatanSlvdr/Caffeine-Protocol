import {
  BENCH_GUESTS,
  ROBOT_UNLOCK_LEVELS,
  benchProblems,
  keptEases,
  shiftNumber,
  type BenchEase,
  type BenchGuest,
  type BenchKit,
  type BenchOrder,
  type LevelDefinition,
} from '@/domain';
import { cafeKey } from '@/features/campaign/save/cafes';
import { andList } from './hints';
import { BENCH_WORDS } from './modals/benchWords';

/** The benches the player has written for the open café, by shift: beside its save and never in it. */
export const benchKey = () => `${cafeKey()}.bench`;

function readOrder(value: unknown): BenchOrder | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { drink, sugar, toGo, rush } = value as Record<string, unknown>;
  if (drink !== 'coffee' && drink !== 'tea') return undefined;
  if (!(['plain', 'with', 'without'].includes(sugar as string) || Number.isInteger(sugar))) return undefined;
  return { drink, sugar: sugar as BenchOrder['sugar'], ...(toGo === true && { toGo }), ...(rush === true && { rush }) };
}

function readGuest(value: unknown): BenchGuest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { orders, mumbles, together, soldOut, later, after } = value as Record<string, unknown>;
  if (!Array.isArray(orders) || typeof after !== 'number') return undefined;
  const read = orders.map(readOrder);
  if (!read.every(Boolean)) return undefined;
  return {
    orders: read as BenchOrder[],
    ...(mumbles === true && { mumbles }),
    ...(together === true && { together }),
    ...((soldOut === 'switch' || soldOut === 'leave') && { soldOut }),
    ...(later === true && { later }),
    after,
  };
}

function readAll(): Record<string, unknown> {
  try {
    const stored = JSON.parse(localStorage.getItem(benchKey()) ?? '{}') as unknown;
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** A shift's bench as kept: its guests, with the rules it eases beside them once it eases any. */
interface KeptBench {
  guests: readonly BenchGuest[];
  eased?: readonly BenchEase[];
}

/** A shift's bench as kept: guests alone, as a bench easing nothing is (and every bench was), or with its eases. */
const keptOf = (stored: unknown): { guests?: unknown; eased?: unknown } =>
  Array.isArray(stored) ? { guests: stored } : stored && typeof stored === 'object' ? stored : {};

/**
 * The bench kept for a shift, or nothing. One the shift can no longer take, from an older café or changed by hand, is
 * read as nothing, so the bench starts again rather than offering guests it can't run.
 */
export function readBench(levelId: string, kit: BenchKit): BenchGuest[] | undefined {
  const stored = keptOf(readAll()[levelId]).guests;
  if (!Array.isArray(stored) || stored.length > BENCH_GUESTS) return undefined;
  const guests = stored.map(readGuest);
  if (!guests.every(Boolean)) return undefined;
  return benchProblems(kit, guests as BenchGuest[]).length ? undefined : (guests as BenchGuest[]);
}

/** The shift's rules its kept bench eases: only ones the shift has, and none when they don't read. */
export function readEased(level: LevelDefinition): BenchEase[] {
  const { eased } = keptOf(readAll()[level.id]);
  return Array.isArray(eased) ? keptEases(level, eased) : [];
}

/** Keep a shift's bench; false when the browser wouldn't, and it lasts until the page closes. */
export function writeBench(levelId: string, guests: readonly BenchGuest[], eased: readonly BenchEase[] = []): boolean {
  const bench: KeptBench | readonly BenchGuest[] = eased.length ? { guests, eased } : guests;
  try {
    localStorage.setItem(benchKey(), JSON.stringify({ ...readAll(), [levelId]: bench }));
    return true;
  } catch {
    return false;
  }
}

/** A rule a bench can ease, as the bench offers it: what it's called, and what changes on this shift. */
export function easeChoice(
  level: LevelDefinition,
  ease: BenchEase,
  say = BENCH_WORDS.en.eases,
): { label: string; detail: string } {
  const service = level.service;
  switch (ease) {
    case 'cups':
      return { label: say.cups.label, detail: say.cups.detail(service?.cups ?? 0) };
    case 'load':
      // The robot the shift asks for a full load: Brew until Porter joins, then Porter.
      return {
        label: say.load.label,
        detail: say.load.detail(shiftNumber(level.id) >= ROBOT_UNLOCK_LEVELS.floor, service?.minLoad ?? 0),
      };
    case 'closing':
      return { label: say.closing.label, detail: say.closing.detail };
  }
}

/** The rules a bench run eased, said after "with": "twice the cups and no closing time"; nothing when it eased none. */
export const easedWords = (eased: readonly BenchEase[] = [], say = BENCH_WORDS.en) =>
  andList(
    eased.map((ease) => say.eased[ease]),
    say.and,
  );
