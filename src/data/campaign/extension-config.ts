/** Extension shift mechanics: one merged config per shift, derived from extension-config.json. */
import * as v from 'valibot';
import { TABLE_LAYOUT } from '../../domain/layout/geometry.ts';
import mechanicsData from './extension-config.json' with { type: 'json' };

/** Every mechanic that used to hide in level-number thresholds, named in one place. */
export interface ExtensionShiftConfig {
  /** Validation customers per seed. */
  customers: number;
  /** Seconds between customer arrivals. */
  arrivalGap: number;
  /** WAIT TICKET claims per prep routine (tray size). */
  prepBatch: number;
  /** WAIT DRINK claims per floor routine (tray size). */
  floorBatch: number;
  /** Tables in play. */
  tables: number;
  /** Items the shift requires carrying together (batch-lesson demos only). */
  minLoad: number;
  /** Alternating coffee/tea orders (L18+). */
  tea: boolean;
  /** Cycled sugar counts including zero (L19+). */
  sugar: boolean;
  /** All-hands service (L31+): reset query starter, sugar TODO on prep. */
  fullHouse: boolean;
  /** Grouped orders plus clarification guests (L32+). */
  finale: boolean;
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
});
const MechanicsSchema = v.looseObject({ stages: v.array(StageSchema), minLoadLevels: v.array(v.number()) });
const mechanics = v.parse(MechanicsSchema, mechanicsData);
const minLoadLevels = new Set(mechanics.minLoadLevels);

/** The L15 stage must set every field; later stages only override what changes. */
function baseConfig(): ExtensionShiftConfig {
  const first = mechanics.stages[0];
  if (
    !first ||
    first.from !== 15 ||
    first.customers === undefined ||
    first.arrivalGap === undefined ||
    first.prepBatch === undefined ||
    first.floorBatch === undefined ||
    first.tables === undefined ||
    first.tea === undefined ||
    first.sugar === undefined ||
    first.fullHouse === undefined ||
    first.finale === undefined
  )
    throw new Error('extension-config.json must open with a complete L15 stage');
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
  };
}
const BASE = baseConfig();

// Full-house tables must track the dining-room geometry, not a stale literal.
if (Math.max(...mechanics.stages.map((stage) => stage.tables ?? 0)) !== TABLE_LAYOUT.length)
  throw new Error('extension-config.json full-house tables must match TABLE_LAYOUT');

/** Merge every stage up to `level`; future shifts inherit the latest stage with no code edits. */
export function extensionShiftConfig(level: number): ExtensionShiftConfig {
  if (!Number.isInteger(level) || level < 15) throw new Error(`Unknown extension shift: L${level}`);
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
  }
  merged.minLoad = minLoadLevels.has(level) ? 2 : 0;
  return merged;
}
