/** Extension shift mechanics: one merged config per shift, derived from extension-config.json. */
import * as v from 'valibot';
import { TABLE_LAYOUT } from '../../domain/layout/geometry.ts';
import { UNLOCKS } from '../../domain/unlocks.ts';
import mechanicsData from './extension-config.json' with { type: 'json' };

/** Every mechanic that used to hide in level-number thresholds, named in one place. */
export interface ExtensionShiftConfig {
  /** Validation customers per seed. */
  customers: number;
  /** Seconds between customer arrivals. */
  arrivalGap: number;
  /** Brew's Wait for Orders claims per routine (tray size). */
  prepBatch: number;
  /** Porter's Wait for Orders claims per routine (tray size). */
  floorBatch: number;
  /** Tables in play. */
  tables: number;
  /** Items the shift requires carrying together (batch-lesson demos only). */
  minLoad: number;
  /** Alternating coffee/tea orders (L10+). */
  tea: boolean;
  /** Cycled sugar counts including zero (L11+). */
  sugar: boolean;
  /** All-hands service (L17+): every robot runs the player's program. */
  fullHouse: boolean;
  /** Grouped orders plus clarification guests (L21). */
  finale: boolean;
  /** Some customers take their order away (Act IV). */
  toGo: boolean;
  /** Cups in the café; 0 means there are always clean ones (Act IV). */
  cups: number;
  /** Some customers are in a rush (Act IV). */
  rush: boolean;
  /** Wait for Orders reports Closed after the last customer, and every robot has to Stop (Act IV). */
  closing: boolean;
}

const StageSchema = v.looseObject({
  from: v.number(),
  customers: v.optional(v.number()),
  arrivalGap: v.optional(v.number()),
  prepBatch: v.optional(v.number()),
  floorBatch: v.optional(v.number()),
  tables: v.optional(v.number()),
  tea: v.optional(v.boolean()),
  sugar: v.optional(v.boolean()),
  fullHouse: v.optional(v.boolean()),
  finale: v.optional(v.boolean()),
  toGo: v.optional(v.boolean()),
  cups: v.optional(v.number()),
  rush: v.optional(v.boolean()),
  closing: v.optional(v.boolean()),
});
const MechanicsSchema = v.looseObject({ stages: v.array(StageSchema), minLoadLevels: v.array(v.number()) });
const mechanics = v.parse(MechanicsSchema, mechanicsData);
const minLoadLevels = new Set(mechanics.minLoadLevels);

/** The first stage must set every field; later stages only override what changes. */
function baseConfig(): ExtensionShiftConfig {
  const first = mechanics.stages[0];
  if (
    !first ||
    first.from !== UNLOCKS.prep ||
    first.customers === undefined ||
    first.arrivalGap === undefined ||
    first.prepBatch === undefined ||
    first.floorBatch === undefined ||
    first.tables === undefined ||
    first.tea === undefined ||
    first.sugar === undefined ||
    first.fullHouse === undefined ||
    first.finale === undefined ||
    first.toGo === undefined ||
    first.cups === undefined ||
    first.rush === undefined ||
    first.closing === undefined
  )
    throw new Error(`extension-config.json must open with a complete L${UNLOCKS.prep} stage`);
  return {
    customers: first.customers,
    arrivalGap: first.arrivalGap,
    prepBatch: first.prepBatch,
    floorBatch: first.floorBatch,
    tables: first.tables,
    minLoad: 0,
    tea: first.tea,
    sugar: first.sugar,
    fullHouse: first.fullHouse,
    finale: first.finale,
    toGo: first.toGo,
    cups: first.cups,
    rush: first.rush,
    closing: first.closing,
  };
}
const BASE = baseConfig();

// Full-house tables must track the dining-room geometry, not a stale literal.
if (Math.max(...mechanics.stages.map((stage) => stage.tables ?? 0)) !== TABLE_LAYOUT.length)
  throw new Error('extension-config.json full-house tables must match TABLE_LAYOUT');

/** The id of a 1-based shift, like L09. */
export const shiftId = (level: number) => `L${String(level).padStart(2, '0')}`;

/** Merge every stage up to `level`; future shifts inherit the latest stage with no code edits. */
export function extensionShiftConfig(level: number): ExtensionShiftConfig {
  if (!Number.isInteger(level) || level < UNLOCKS.prep) throw new Error(`Unknown extension shift: L${level}`);
  const merged: ExtensionShiftConfig = { ...BASE };
  for (const { from, ...override } of mechanics.stages.slice(1)) {
    if (level < from) break;
    if (override.customers !== undefined) merged.customers = override.customers;
    if (override.arrivalGap !== undefined) merged.arrivalGap = override.arrivalGap;
    if (override.prepBatch !== undefined) merged.prepBatch = override.prepBatch;
    if (override.floorBatch !== undefined) merged.floorBatch = override.floorBatch;
    if (override.tables !== undefined) merged.tables = override.tables;
    if (override.tea !== undefined) merged.tea = override.tea;
    if (override.sugar !== undefined) merged.sugar = override.sugar;
    if (override.fullHouse !== undefined) merged.fullHouse = override.fullHouse;
    if (override.finale !== undefined) merged.finale = override.finale;
    if (override.toGo !== undefined) merged.toGo = override.toGo;
    if (override.cups !== undefined) merged.cups = override.cups;
    if (override.rush !== undefined) merged.rush = override.rush;
    if (override.closing !== undefined) merged.closing = override.closing;
  }
  merged.minLoad = minLoadLevels.has(level) ? 2 : 0;
  return merged;
}
