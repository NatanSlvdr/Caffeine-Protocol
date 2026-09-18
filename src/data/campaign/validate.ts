// Single source of truth for campaign semantic invariants.
//
// Both the runtime loaders (campaign/load, extension) and build tooling
// (tools/validate-data.mjs) validate through this module, so Act I shifts
// (L01-L14) and generated extension shifts (L15-L32) satisfy the same rules.
//
// NOTE: relative imports below use explicit `.ts` extensions so plain Node
// (which type-strips `.ts` files for tools/validate-data.mjs) can load this
// module directly. Vite, vitest, and tsc accept explicit extensions because
// tsconfig sets `allowImportingTsExtensions`.
import * as v from 'valibot';
import { LessonSchema, LevelSchema, ManifestSchema } from './schema.ts';
import { TABLE_LAYOUT } from '../../domain/layout/geometry.ts';
import type { Customer, LevelDefinition, ServiceConfig, ValidationSeed } from '../../domain/types.ts';

/** Number of playable tables backing `active_tables` bounds. */
export const MAX_TABLES = TABLE_LAYOUT.length;

export const LEVEL_ID_RE = /^L\d+$/;
export const SEED_ID_RE = /^L\d+_[A-Z]$/;
export const CUSTOMER_ID_RE = /^C\d+$/;

/** Closed concept vocabulary shared with schema.ts for semantic checks. */
const TOKENS = new Set(['ambiguous', 'coffee', 'negation', 'number', 'sugar', 'tea']);

/** Table count derivation shared with src/data/extension.ts (do not fork). */
export function extensionActiveTables(levelNumber: number): number {
  if (levelNumber >= 31) return TABLE_LAYOUT.length;
  if (levelNumber >= 29) return 4;
  if (levelNumber >= 24) return 2;
  return 1;
}

/** Worker capacity derivation shared with src/data/extension.ts (do not fork). */
export function extensionServiceForLevel(levelNumber: number): ServiceConfig {
  const batch = levelNumber >= 21 ? 2 : 1;
  return {
    prepCapacity: batch,
    floorCapacity: levelNumber >= 29 ? 2 : 1,
    clearing: true,
    objective: 'serve',
    minLoad: levelNumber === 21 || levelNumber === 29 ? 2 : 0,
  };
}

/** Act derivation shared with src/data/extension.ts (do not fork). */
export function extensionAct(levelNumber: number): number {
  if (levelNumber < 23) return 2;
  if (levelNumber < 31) return 3;
  return 4;
}

function formatIssues(issues: readonly v.GenericIssue[], context: string): string[] {
  return issues.map((issue) => {
    const path = (issue.path ?? []).map((segment) => String(segment.key ?? '?')).join('.');
    return path ? `${context}.${path}: ${issue.message}` : `${context}: ${issue.message}`;
  });
}

interface HeardOrderLike {
  tokens?: unknown;
  number?: unknown;
}

interface TicketLike {
  item?: unknown;
  with_sugar?: unknown;
  sugar_count?: unknown;
  tickets?: unknown;
  ask_help?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectHeardOrderErrors(order: unknown, context: string): string[] {
  const errors: string[] = [];
  if (!isRecord(order)) {
    errors.push(`${context}: heard order must be an object`);
    return errors;
  }
  const raw = order as HeardOrderLike;
  if (!Array.isArray(raw.tokens) || raw.tokens.length === 0) {
    errors.push(`${context}: tokens must be a non-empty array`);
    return errors;
  }
  for (const token of raw.tokens) {
    if (typeof token !== 'string' || !TOKENS.has(token))
      errors.push(`${context}: unknown token ${JSON.stringify(token)}`);
  }
  const tokens = raw.tokens as string[];
  const hasNumberToken = tokens.includes('number');
  if (hasNumberToken) {
    if (!Number.isInteger(raw.number) || (raw.number as number) < 0)
      errors.push(`${context}: 'number' token requires a non-negative integer number`);
  } else if (raw.number !== undefined) {
    errors.push(`${context}: number without a 'number' token`);
  }
  if (tokens.includes('ambiguous')) {
    if (tokens.length !== 1) errors.push(`${context}: 'ambiguous' must be the only token`);
    if (raw.number !== undefined) errors.push(`${context}: 'ambiguous' orders carry no number`);
  }
  return errors;
}

function collectTicketErrors(ticket: unknown, context: string): string[] {
  const errors: string[] = [];
  if (!isRecord(ticket)) {
    errors.push(`${context}: ticket must be an object`);
    return errors;
  }
  const raw = ticket as TicketLike;
  if (raw.item !== 'coffee' && raw.item !== 'tea') errors.push(`${context}: ticket item must be coffee or tea`);
  if (raw.with_sugar !== undefined && typeof raw.with_sugar !== 'boolean')
    errors.push(`${context}: with_sugar must be a boolean`);
  if (raw.sugar_count !== undefined && (!Number.isInteger(raw.sugar_count) || (raw.sugar_count as number) < 0))
    errors.push(`${context}: sugar_count must be a non-negative integer`);
  if (raw.with_sugar !== undefined && raw.sugar_count !== undefined)
    errors.push(`${context}: with_sugar and sugar_count are mutually exclusive`);
  return errors;
}

function collectCustomerErrors(customer: Customer, index: number, seedId: string): string[] {
  const errors: string[] = [];
  const context = `${seedId}/${customer.customer_id || `customer#${index}`}`;
  if (customer.customer_id !== `C${index + 1}`)
    errors.push(`${seedId}: customer_id ${JSON.stringify(customer.customer_id)} breaks sequential C1..Cn order`);
  if (!Number.isInteger(customer.arrival) || customer.arrival < 0)
    errors.push(`${context}: arrival must be a non-negative integer`);
  if (typeof customer.phrase !== 'string' || customer.phrase.length === 0)
    errors.push(`${context}: phrase must be a non-empty string`);

  const heard = customer.heard_orders ?? [];
  if (!Array.isArray(heard) || heard.length === 0) {
    errors.push(`${context}: heard_orders must be a non-empty array`);
    return errors;
  }
  heard.forEach((order, orderIndex) => {
    errors.push(...collectHeardOrderErrors(order, `${context}.heard_orders[${orderIndex}]`));
  });

  const clarificationHeard = customer.clarification_heard_orders ?? [];
  clarificationHeard.forEach((order, orderIndex) => {
    errors.push(...collectHeardOrderErrors(order, `${context}.clarification_heard_orders[${orderIndex}]`));
    const tokens = (isRecord(order) ? (order as HeardOrderLike).tokens : undefined) as string[] | undefined;
    if (Array.isArray(tokens) && tokens.includes('ambiguous'))
      errors.push(`${context}.clarification_heard_orders[${orderIndex}]: clarification must be concrete`);
  });

  const isAmbiguous = heard.some(
    (order) =>
      isRecord(order) &&
      Array.isArray((order as HeardOrderLike).tokens) &&
      ((order as HeardOrderLike).tokens as string[]).includes('ambiguous'),
  );
  const expected = (customer.expected ?? {}) as TicketLike & { tickets?: unknown[] };
  if (isAmbiguous) {
    if (typeof customer.clarification !== 'string' || customer.clarification.trim().length === 0)
      errors.push(`${context}: ambiguous customers require a non-empty clarification`);
    if (clarificationHeard.length === 0)
      errors.push(`${context}: ambiguous customers require non-empty clarification_heard_orders`);
    if (expected.ask_help !== true) errors.push(`${context}: ambiguous customers require expected.ask_help`);
    if (expected.item !== 'coffee' && expected.item !== 'tea')
      errors.push(`${context}: ambiguous customers resolve to a single item`);
    if (expected.tickets !== undefined) errors.push(`${context}: ambiguous customers never carry grouped tickets`);
  } else {
    if (typeof customer.clarification === 'string' && customer.clarification.trim().length > 0)
      errors.push(`${context}: non-ambiguous customers must not carry clarification text`);
    if (clarificationHeard.length > 0)
      errors.push(`${context}: non-ambiguous customers must not carry clarification_heard_orders`);
    if (expected.ask_help === true) errors.push(`${context}: only ambiguous customers set expected.ask_help`);
  }

  const hasItem = expected.item !== undefined;
  const hasTickets = expected.tickets !== undefined;
  if (hasItem === hasTickets) errors.push(`${context}: expected needs exactly one of item or tickets`);
  if (hasItem && expected.item !== 'coffee' && expected.item !== 'tea')
    errors.push(`${context}: expected item must be coffee or tea`);
  if (hasItem && heard.length !== 1) errors.push(`${context}: single orders pair with exactly one heard order`);
  if (expected.with_sugar !== undefined && typeof expected.with_sugar !== 'boolean')
    errors.push(`${context}: with_sugar must be a boolean`);
  if (
    expected.sugar_count !== undefined &&
    (!Number.isInteger(expected.sugar_count) || (expected.sugar_count as number) < 0)
  )
    errors.push(`${context}: sugar_count must be a non-negative integer`);
  if (expected.with_sugar !== undefined && expected.sugar_count !== undefined)
    errors.push(`${context}: with_sugar and sugar_count are mutually exclusive`);
  if (hasTickets) {
    if (!Array.isArray(expected.tickets) || expected.tickets.length === 0) {
      errors.push(`${context}: expected.tickets must be a non-empty array`);
    } else {
      expected.tickets.forEach((ticket, ticketIndex) => {
        errors.push(...collectTicketErrors(ticket, `${context}.expected.tickets[${ticketIndex}]`));
      });
      if (expected.tickets.length !== heard.length)
        errors.push(
          `${context}: grouped tickets (${expected.tickets.length}) must match heard orders (${heard.length})`,
        );
    }
  }
  return errors;
}

/** Semantic checks for one seed; `levelId` enforces the `<level>_<letter>` correspondence. */
export function collectSeedErrors(seed: ValidationSeed, levelId: string): string[] {
  const errors: string[] = [];
  if (!SEED_ID_RE.test(seed.id)) errors.push(`${levelId}: seed id ${JSON.stringify(seed.id)} must match L<nn>_<A-Z>`);
  if (!seed.id.startsWith(`${levelId}_`)) errors.push(`seed ${seed.id} does not correspond to level ${levelId}`);
  const customers = seed.customers ?? [];
  if (!Array.isArray(customers) || customers.length === 0) {
    errors.push(`seed ${seed.id}: customers must be a non-empty array`);
    return errors;
  }
  const seenCustomers = new Set<string>();
  customers.forEach((customer, index) => {
    if (seenCustomers.has(customer.customer_id))
      errors.push(`seed ${seed.id}: duplicate customer_id ${customer.customer_id}`);
    seenCustomers.add(customer.customer_id);
    if (!CUSTOMER_ID_RE.test(customer.customer_id ?? ''))
      errors.push(`seed ${seed.id}: customer_id ${JSON.stringify(customer.customer_id)} must match C<n>`);
    errors.push(...collectCustomerErrors(customer, index, seed.id));
  });
  customers.forEach((customer, index) => {
    if (index === 0) return;
    if (customer.arrival <= customers[index - 1].arrival)
      errors.push(
        `seed ${seed.id}: arrivals must be strictly increasing (${customers[index - 1].arrival} -> ${customer.arrival})`,
      );
  });
  return errors;
}

/** Semantic checks for one level beyond the structural schema. */
export function collectLevelErrors(level: LevelDefinition): string[] {
  const errors: string[] = [];
  if (!LEVEL_ID_RE.test(level.id)) errors.push(`level id ${JSON.stringify(level.id)} must match L<n>`);
  const numeric = Number(level.id.slice(1));
  if (!Number.isInteger(numeric) || numeric < 1)
    errors.push(`level id ${JSON.stringify(level.id)} needs a positive number`);
  else {
    const prefix = `Level ${numeric}: `;
    if (!level.title.startsWith(prefix) || level.title.length <= prefix.length)
      errors.push(`${level.id}: title must start with ${JSON.stringify(prefix)}`);
  }
  if (typeof level.summary !== 'string' || level.summary.length === 0)
    errors.push(`${level.id}: summary must be non-empty`);
  if (!Number.isInteger(level.active_tables) || level.active_tables < 1)
    errors.push(`${level.id}: active_tables must be a positive integer`);
  else if (level.active_tables > MAX_TABLES)
    errors.push(`${level.id}: active_tables ${level.active_tables} exceeds table layout (${MAX_TABLES})`);
  for (const field of ['block_target', 'instruction_target', 'reference_block_count'] as const) {
    const value = level[field];
    if (!Number.isInteger(value) || (value as number) < 0)
      errors.push(`${level.id}: ${field} must be a non-negative integer`);
  }
  if (level.programming_enabled) {
    if (level.block_target < 1 || level.instruction_target < 1 || level.reference_block_count < 1)
      errors.push(`${level.id}: programmable shifts need positive block/instruction targets`);
    if (level.block_target < level.reference_block_count)
      errors.push(`${level.id}: block_target ${level.block_target} is below reference ${level.reference_block_count}`);
  } else if (level.block_target !== 0 || level.instruction_target !== 0 || level.reference_block_count !== 0) {
    errors.push(`${level.id}: observation shifts must have zero block/instruction targets`);
  }
  const seeds = level.seeds ?? [];
  if (!Array.isArray(seeds) || seeds.length === 0) {
    errors.push(`${level.id}: seeds must be a non-empty array`);
    return errors;
  }
  const seenSeeds = new Set<string>();
  for (const seed of seeds) {
    if (seenSeeds.has(seed.id)) errors.push(`${level.id}: duplicate seed id ${seed.id}`);
    seenSeeds.add(seed.id);
    errors.push(...collectSeedErrors(seed, level.id));
  }
  return errors;
}

/** Structural plus semantic validation for raw level JSON (runtime and tooling share this). */
export function validateLevelData(data: unknown): string[] {
  const parsed = v.safeParse(LevelSchema, data);
  if (!parsed.success) return formatIssues(parsed.issues, 'level');
  return collectLevelErrors(parsed.output as LevelDefinition);
}

type LessonData = v.InferOutput<typeof LessonSchema>;

/** Structural plus semantic validation for raw lesson JSON. */
export function validateLessonData(data: unknown): string[] {
  const parsed = v.safeParse(LessonSchema, data);
  if (!parsed.success) return formatIssues(parsed.issues, 'lesson');
  return [];
}

/** Structural plus duplicate-id validation for raw manifest JSON. */
export function validateManifestData(data: unknown): string[] {
  const parsed = v.safeParse(ManifestSchema, data);
  if (!parsed.success) return formatIssues(parsed.issues, 'manifest');
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const id of parsed.output.order) {
    if (seen.has(id)) errors.push(`manifest: duplicate id ${id}`);
    seen.add(id);
  }
  return errors;
}

const ExtensionSeedSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(/^L\d+$/)),
  title: v.pipe(v.string(), v.minLength(1)),
  note: v.pipe(v.string(), v.minLength(1)),
  omission: v.pipe(v.string(), v.minLength(1)),
  blocks: v.pipe(v.number(), v.integer(), v.minValue(1)),
  instructions: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type ExtensionSeedLike = v.InferOutput<typeof ExtensionSeedSchema>;

/** Structural validation for one extension seed row (L15+). */
export function validateExtensionSeedData(data: unknown): string[] {
  const parsed = v.safeParse(ExtensionSeedSchema, data);
  if (!parsed.success) return formatIssues(parsed.issues, 'extensionSeed');
  return [];
}

interface NarrativeRow {
  level?: unknown;
  title?: unknown;
  story?: unknown;
  objective?: unknown;
  lessonNote?: unknown;
}

/** Narrative shape plus contiguous 1..N level coverage. */
export function collectNarrativeErrors(narrative: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(narrative) || narrative.length === 0) {
    errors.push('narrative: campaignNarrative must be a non-empty array');
    return errors;
  }
  const levels = (narrative as NarrativeRow[]).map((row) => row.level);
  levels.forEach((level, index) => {
    if (level !== index + 1)
      errors.push(`narrative[${index}]: level ${JSON.stringify(level)} breaks contiguous 1..N coverage`);
  });
  (narrative as NarrativeRow[]).forEach((row, index) => {
    const context = `narrative[${index}]`;
    for (const field of ['title', 'story', 'objective', 'lessonNote'] as const) {
      if (typeof row[field] !== 'string' || (row[field] as string).length === 0)
        errors.push(`${context}: ${field} must be a non-empty string`);
    }
  });
  const seen = new Set<unknown>();
  for (const level of levels) {
    if (seen.has(level)) errors.push(`narrative: duplicate level ${JSON.stringify(level)}`);
    seen.add(level);
  }
  return errors;
}

export interface CampaignInputs {
  manifestOrder: string[];
  actLevels: LevelDefinition[];
  actLessons: LessonData[];
  narrative: NarrativeRow[];
  extensionSeeds: ExtensionSeedLike[];
}

/** Cross-file correspondence: unique ids, title/note alignment, full 1..N coverage. */
export function validateCampaign(inputs: CampaignInputs): string[] {
  const errors: string[] = [];
  const { manifestOrder, actLevels, actLessons, narrative, extensionSeeds } = inputs;
  const manifestSeen = new Set<string>();
  for (const id of manifestOrder) {
    if (manifestSeen.has(id)) errors.push(`manifest: duplicate id ${id}`);
    manifestSeen.add(id);
  }
  if (actLevels.length !== manifestOrder.length)
    errors.push(`campaign: ${actLevels.length} Act I levels do not match manifest order (${manifestOrder.length})`);
  actLevels.forEach((level, index) => {
    if (level.id !== manifestOrder[index])
      errors.push(`campaign: Act I level ${level.id} is out of manifest order at index ${index}`);
  });
  if (actLessons.length !== manifestOrder.length)
    errors.push(`campaign: ${actLessons.length} Act I lessons do not match manifest order (${manifestOrder.length})`);

  const seedIds = new Set<string>();
  for (const level of actLevels) {
    for (const seed of level.seeds) {
      if (seedIds.has(seed.id)) errors.push(`campaign: duplicate seed id ${seed.id}`);
      seedIds.add(seed.id);
    }
  }
  const levelIds = new Set<string>([...manifestOrder]);
  for (const seed of extensionSeeds) {
    if (levelIds.has(seed.id)) errors.push(`campaign: duplicate shift id ${seed.id}`);
    levelIds.add(seed.id);
  }

  const total = manifestOrder.length + extensionSeeds.length;
  if (narrative.length !== total)
    errors.push(`campaign: narrative covers ${narrative.length} shifts but levels total ${total}`);
  narrative.forEach((row, index) => {
    if (row.level !== index + 1)
      errors.push(`campaign: narrative row ${index} covers level ${JSON.stringify(row.level)}, expected ${index + 1}`);
  });

  actLevels.forEach((level, index) => {
    const row = narrative[index] as NarrativeRow | undefined;
    if (!row) return;
    const suffix = level.title.replace(/^Level \d+: /, '');
    if (row.title !== suffix)
      errors.push(
        `${level.id}: level title ${JSON.stringify(suffix)} differs from narrative ${JSON.stringify(row.title)}`,
      );
    const lesson = actLessons[index] as LessonData | undefined;
    if (lesson && row.lessonNote !== lesson.note)
      errors.push(`${level.id}: lesson note differs from narrative lessonNote`);
  });
  extensionSeeds.forEach((seed, seedIndex) => {
    const row = narrative[manifestOrder.length + seedIndex] as NarrativeRow | undefined;
    if (!row) return;
    if (row.title !== seed.title) errors.push(`${seed.id}: extension title differs from narrative title`);
    if (row.lessonNote !== seed.note) errors.push(`${seed.id}: extension note differs from narrative lessonNote`);
  });
  return errors;
}

export interface BuiltExtensionInputs {
  levelNumber: number;
  level: LevelDefinition;
  lesson: LessonData;
  seed: ExtensionSeedLike;
}

/** Built extension shift must reproduce its seed row plus shared derivations. */
export function collectBuiltExtensionErrors(inputs: BuiltExtensionInputs): string[] {
  const errors: string[] = [];
  const { levelNumber, level, lesson, seed } = inputs;
  const expectedId = `L${levelNumber}`;
  if (seed.id !== expectedId) errors.push(`${seed.id}: extension seed id must equal ${expectedId}`);
  if (level.id !== expectedId) errors.push(`extension level ${level.id} must equal ${expectedId}`);
  const suffix = level.title.replace(/^Level \d+: /, '');
  if (suffix !== seed.title) errors.push(`${seed.id}: built title ${JSON.stringify(suffix)} differs from seed title`);
  if (level.summary !== seed.note) errors.push(`${seed.id}: built summary differs from seed note`);
  if (lesson.note !== seed.note) errors.push(`${seed.id}: built lesson note differs from seed note`);
  if (level.block_target !== seed.blocks)
    errors.push(`${seed.id}: block_target ${level.block_target} differs from seed blocks ${seed.blocks}`);
  if (level.instruction_target !== seed.instructions)
    errors.push(
      `${seed.id}: instruction_target ${level.instruction_target} differs from seed instructions ${seed.instructions}`,
    );
  // reference_block_count is measured from the reference programs (same counter
  // the scorer uses), not the star target: it must stay within the seed budget.
  if (level.reference_block_count < 1 || level.reference_block_count > seed.blocks)
    errors.push(
      `${seed.id}: reference_block_count ${level.reference_block_count} must be within 1..seed blocks ${seed.blocks}`,
    );
  if (level.act !== extensionAct(levelNumber))
    errors.push(`${seed.id}: act ${level.act} differs from derived ${extensionAct(levelNumber)}`);
  if (level.active_tables !== extensionActiveTables(levelNumber))
    errors.push(
      `${seed.id}: active_tables ${level.active_tables} differs from derived ${extensionActiveTables(levelNumber)}`,
    );
  const expectedService = extensionServiceForLevel(levelNumber);
  const service = level.service as ServiceConfig | undefined;
  if (!service) errors.push(`${seed.id}: extension shifts require a service config`);
  else {
    if (service.prepCapacity !== expectedService.prepCapacity)
      errors.push(
        `${seed.id}: prepCapacity ${service.prepCapacity} differs from derived ${expectedService.prepCapacity}`,
      );
    if (service.floorCapacity !== expectedService.floorCapacity)
      errors.push(
        `${seed.id}: floorCapacity ${service.floorCapacity} differs from derived ${expectedService.floorCapacity}`,
      );
    if (service.clearing !== true) errors.push(`${seed.id}: extension clearing must be true`);
    if (service.objective !== 'serve') errors.push(`${seed.id}: extension objective must be serve`);
    if ((service.minLoad ?? 0) !== expectedService.minLoad)
      errors.push(`${seed.id}: minLoad ${service.minLoad} differs from derived ${expectedService.minLoad}`);
  }
  return errors;
}
