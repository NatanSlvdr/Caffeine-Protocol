import * as v from 'valibot';

/** Authored concept tokens recognized in customer speech; closed by design. */
export const TokenSchema = v.picklist(['ambiguous', 'coffee', 'negation', 'number', 'sugar', 'tea']);

const HeardOrderSchema = v.looseObject({
  tokens: v.array(TokenSchema),
  number: v.optional(v.number()),
});

/** One recognized order: drink and modifiers; campaign data never nests these. */
const TicketLikeSchema = v.looseObject({
  confidence: v.optional(v.picklist(['clear', 'ambiguous'])),
  drink: v.optional(v.picklist(['coffee', 'tea'])),
  with_sugar: v.optional(v.boolean()),
  sugar_count: v.optional(v.number()),
  item: v.optional(v.picklist(['coffee', 'tea'])),
  ask_help: v.optional(v.boolean()),
});

const SpeechIntentSchema = v.looseObject({
  confidence: v.optional(v.picklist(['clear', 'ambiguous'])),
  drink: v.optional(v.picklist(['coffee', 'tea'])),
  with_sugar: v.optional(v.boolean()),
  sugar_count: v.optional(v.number()),
  orders: v.optional(v.array(TicketLikeSchema)),
});

const ExpectedTicketSchema = v.looseObject({
  item: v.optional(v.picklist(['coffee', 'tea'])),
  with_sugar: v.optional(v.boolean()),
  sugar_count: v.optional(v.number()),
  tickets: v.optional(v.array(TicketLikeSchema)),
  ask_help: v.optional(v.boolean()),
});

export const CustomerSchema = v.looseObject({
  customer_id: v.string(),
  arrival: v.number(),
  phrase: v.string(),
  heard_orders: v.array(HeardOrderSchema),
  clarification_heard_orders: v.optional(v.array(HeardOrderSchema)),
  clarification: v.optional(v.string()),
  intent: SpeechIntentSchema,
  clarification_intent: v.optional(SpeechIntentSchema),
  expected: ExpectedTicketSchema,
});


export const ValidationSeedSchema = v.looseObject({
  id: v.string(),
  customers: v.array(CustomerSchema),
});

export const ServiceConfigSchema = v.looseObject({
  prepCapacity: v.number(),
  floorCapacity: v.number(),
  clearing: v.boolean(),
  objective: v.picklist(['serve', 'prepare', 'pickup']),
  minLoad: v.optional(v.number()),
});

export const LevelSchema = v.looseObject({
  id: v.string(),
  title: v.string(),
  summary: v.string(),
  act: v.optional(v.number()),
  active_tables: v.number(),
  block_target: v.number(),
  instruction_target: v.number(),
  programming_enabled: v.boolean(),
  reference_block_count: v.number(),
  seeds: v.array(ValidationSeedSchema),
  service: v.optional(ServiceConfigSchema),
});

const RobotProgramsSchema = v.object({
  query: v.string(),
  prep: v.string(),
  floor: v.string(),
});

export const LessonSchema = v.looseObject({
  note: v.string(),
  solution: v.string(),
  starter: v.string(),
  robotStarter: v.optional(RobotProgramsSchema),
  robotSolution: v.optional(RobotProgramsSchema),
});
export type Lesson = v.InferOutput<typeof LessonSchema>;

export const ManifestSchema = v.looseObject({
  version: v.number(),
  order: v.array(v.string()),
});
