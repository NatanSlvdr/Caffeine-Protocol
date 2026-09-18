import * as v from 'valibot';

/** Authored concept tokens recognized in customer speech; closed by design. */
export const TokenSchema = v.picklist(['ambiguous', 'coffee', 'negation', 'number', 'sugar', 'tea']);

/** Non-negative integer counts (arrivals, sugar amounts, capacities, targets). */
const NonNegativeInt = v.pipe(v.number(), v.integer(), v.minValue(0));
const PositiveInt = v.pipe(v.number(), v.integer(), v.minValue(1));
const LevelId = v.pipe(v.string(), v.regex(/^L\d+$/));
const SeedId = v.pipe(v.string(), v.regex(/^L\d+_[A-Z]$/));
const CustomerId = v.pipe(v.string(), v.regex(/^C\d+$/));
const NonEmptyString = v.pipe(v.string(), v.minLength(1));

const HeardOrderSchema = v.strictObject({
  tokens: v.pipe(v.array(TokenSchema), v.minLength(1)),
  number: v.optional(NonNegativeInt),
});

/** One recognized order: drink and modifiers; campaign data never nests these. */
const TicketLikeSchema = v.strictObject({
  confidence: v.optional(v.picklist(['clear', 'ambiguous'])),
  drink: v.optional(v.picklist(['coffee', 'tea'])),
  with_sugar: v.optional(v.boolean()),
  sugar_count: v.optional(NonNegativeInt),
  item: v.optional(v.picklist(['coffee', 'tea'])),
  ask_help: v.optional(v.boolean()),
});

const SpeechIntentSchema = v.strictObject({
  confidence: v.optional(v.picklist(['clear', 'ambiguous'])),
  drink: v.optional(v.picklist(['coffee', 'tea'])),
  with_sugar: v.optional(v.boolean()),
  sugar_count: v.optional(NonNegativeInt),
  orders: v.optional(v.array(TicketLikeSchema)),
});

const ExpectedTicketSchema = v.strictObject({
  item: v.optional(v.picklist(['coffee', 'tea'])),
  with_sugar: v.optional(v.boolean()),
  sugar_count: v.optional(NonNegativeInt),
  tickets: v.optional(v.pipe(v.array(TicketLikeSchema), v.minLength(1))),
  ask_help: v.optional(v.boolean()),
});

export const CustomerSchema = v.strictObject({
  customer_id: CustomerId,
  arrival: NonNegativeInt,
  phrase: NonEmptyString,
  heard_orders: v.pipe(v.array(HeardOrderSchema), v.minLength(1)),
  clarification_heard_orders: v.optional(v.array(HeardOrderSchema)),
  clarification: v.optional(v.string()),
  intent: SpeechIntentSchema,
  clarification_intent: v.optional(SpeechIntentSchema),
  expected: ExpectedTicketSchema,
});

export const ValidationSeedSchema = v.strictObject({
  id: SeedId,
  customers: v.pipe(v.array(CustomerSchema), v.minLength(1)),
});

export const ServiceConfigSchema = v.strictObject({
  prepCapacity: PositiveInt,
  floorCapacity: PositiveInt,
  clearing: v.boolean(),
  objective: v.picklist(['serve', 'prepare', 'pickup']),
  minLoad: v.optional(NonNegativeInt),
});

export const LevelSchema = v.strictObject({
  id: LevelId,
  title: NonEmptyString,
  summary: NonEmptyString,
  act: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4))),
  active_tables: PositiveInt,
  block_target: NonNegativeInt,
  instruction_target: NonNegativeInt,
  programming_enabled: v.boolean(),
  /** Measured reference-solution size; block_target adds the star margin on top. */
  reference_block_count: NonNegativeInt,
  seeds: v.pipe(v.array(ValidationSeedSchema), v.minLength(1)),
  service: v.optional(ServiceConfigSchema),
});

const RobotProgramsSchema = v.strictObject({
  query: NonEmptyString,
  prep: NonEmptyString,
  floor: NonEmptyString,
});

export const LessonSchema = v.strictObject({
  note: NonEmptyString,
  solution: NonEmptyString,
  starter: NonEmptyString,
  robotStarter: v.optional(RobotProgramsSchema),
  robotSolution: v.optional(RobotProgramsSchema),
});
export type Lesson = v.InferOutput<typeof LessonSchema>;

export const ManifestSchema = v.strictObject({
  version: PositiveInt,
  order: v.pipe(v.array(LevelId), v.minLength(1)),
});
