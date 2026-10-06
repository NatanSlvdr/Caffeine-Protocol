import type { FailureCode, FailureContext } from './failures';
import type { BenchEase } from './bench';
import type { Challenge, ChallengeMeasure } from './challenges';

export type Drink = 'coffee' | 'tea';
export interface SpeechIntent {
  confidence?: 'clear' | 'ambiguous';
  drink?: Drink;
  with_sugar?: boolean;
  sugar_count?: number;
  to_go?: boolean;
  rush?: boolean;
  together?: boolean;
  orders?: SpeechIntent[];
}
export interface ExpectedTicket {
  item?: Drink;
  with_sugar?: boolean;
  sugar_count?: number;
  to_go?: boolean;
  rush?: boolean;
  together?: boolean;
}
/** Authored concepts available to Query; expected ticket fields stay separate. */
export interface HeardOrder {
  tokens: string[];
  number?: number;
}
export interface Customer {
  heard_orders: HeardOrder[];
  clarification_heard_orders?: HeardOrder[];
  customer_id: string;
  arrival: number;
  phrase: string;
  clarification?: string;
  intent: SpeechIntent;
  clarification_intent?: SpeechIntent;
  /** `closing` marks the closing-time call after the last guest: Query must stop without writing a ticket. */
  expected: ExpectedTicket & { tickets?: ExpectedTicket[]; ask_help?: boolean; closing?: boolean };
}
export interface ValidationSeed {
  id: string;
  customers: Customer[];
  /** A bench only: the shift's rules it eased for practice, so it plays them that way; see `easedShift`. */
  eased?: readonly BenchEase[];
}
/** block_target is the two-star threshold (reference plus margin); reference_block_count is the measured reference size. */
export interface LevelDefinition {
  service?: ServiceConfig;
  act?: number;
  id: string;
  title: string;
  programming_enabled: boolean;
  block_target: number;
  instruction_target: number;
  reference_block_count: number;
  seeds: ValidationSeed[];
  summary: string;
  active_tables: number;
  /** Optional goals for after a pass, each weighing the service from one side; they earn no stars. */
  challenges?: Challenge[];
}
export interface Program {
  source: string;
  instructions: string[];
  source_lines: number[];
  ends: Record<number, number>;
  alternatives: Record<number, number>;
  positions: Record<string, number>;
  functions: Record<string, number>;
  compile_error: string;
  error_line: number;
  block_count: number;
}
export interface TraceStep {
  line: number;
  command: string;
  function_depth: number;
  /** On an IF: which way it went, and the tokens it tested, by source, as Query heard them. */
  decision?: ConditionDecision;
}
export interface ConditionDecision {
  holds: boolean;
  heard: Record<string, string[]>;
}
export interface OrderTicket {
  quantity?: number;
  ticket_id: string;
  customer_id: string;
  table_id: string | null;
  source_phrase: string;
  source_intent: SpeechIntent;
  item: string;
  with_sugar: boolean | null;
  sugar_count: number | null;
  /** Written by Query for take-away orders: a lid, and the to-go shelf instead of a table. */
  to_go?: boolean;
  /** Written by Query for customers in a rush: the order jumps the queue. */
  rush?: boolean;
  /** Written by Query for a table that orders together: its drinks arrive together. */
  together?: boolean;
  status: string;
  created_at: number;
  due_at: number;
  debug_notes: string;
}
export interface RuntimeState {
  pc: number;
  stopped: boolean;
  counter?: 0 | 1;
}
export interface OrderPayment {
  amount: number;
  ticketIds: string[];
}
export interface CustomerExecution {
  variables?: Record<string, number | undefined>;
  heldPaper?: OrderTicket;
  /** Query's innermost For loop after the step, if it is in one. */
  loop?: LoopPosition;
  payment?: OrderPayment;
  tickets: OrderTicket[];
  asked_help: boolean;
  error: string;
  error_code?: FailureCode;
  error_context?: FailureContext;
  error_line?: number;
  executed_instructions: number;
  trace: TraceStep[];
  state: RuntimeState;
}
export interface Timing {
  seating?: number;
  arrival: number;
  created: number;
  seated: number;
  ready: number;
  /** When the table's first drink was set down, if it was; `served` is when the last one was. */
  firstServed?: number;
  served: number;
  left: number;
  cleaned: number;
}
export interface ReplayEvent {
  payment?: OrderPayment;
  seed_id: string;
  customer: Customer;
  tickets: OrderTicket[];
  asked_help: boolean;
  passed: boolean;
  reason?: string;
  failure_code?: FailureCode;
  failure_context?: FailureContext;
  trace: TraceStep[];
  failure_line?: number;
  timing: Timing;
  table: number;
  satisfaction: number;
}
export interface RunFailure {
  role?: RobotRole;
  seed_id: string;
  error_line: number;
  customer_id: string;
  event_time: number;
  phrase: string;
  intent: SpeechIntent;
  expected: Customer['expected'];
  actual: OrderTicket[];
  /** What went wrong, for hints and inspection; `reason` is only its wording. */
  code: FailureCode;
  context?: FailureContext;
  reason: string;
}
export interface RunResult {
  execution?: SeedExecution[];
  programs?: RobotPrograms;
  passed: boolean;
  observation: boolean;
  events: ReplayEvent[];
  block_count?: number;
  level_id: string;
  level_title: string;
  passed_seeds: number;
  required_seeds: number;
  tickets: OrderTicket[];
  executed_instructions: number;
  average_satisfaction: number;
  stars: number;
  first_failure: RunFailure | null;
  /** A practice run of one round: it can pass, but only the full service earns stars or unlocks a shift. */
  practice?: boolean;
}
export interface Settings {
  /** The café soundtrack's loudness, the game's only sound. */
  music: number;
  reduced_motion: boolean;
  pixel_art: boolean;
  /** Edit programs as plain text instead of blocks. */
  text_editor: boolean;
  /** How fast service plays back, carried from shift to shift. */
  speed: number;
  /** Show the step-by-step tips on the first shift with a routine to write, until it's served or they're hidden. */
  first_routine_tips: boolean;
  /** Skip the intro of a shift already worked on, and keep the crew's reactions already heard to one line. */
  short_repeats: boolean;
  /** Draw the block picked in the routine where it goes in the café: its walk, or what it reaches. */
  block_preview: boolean;
  /** Tell the service in words beside the café, and say what happens in it as it plays. */
  service_summary: boolean;
  /** How the crew's lines appear. Reduced motion shows them whole, whatever this says. */
  dialogue_pace: DialoguePace;
}
/** Typed out a letter at a time, typed three times as fast, or each line shown whole at once. */
export type DialoguePace = 'typed' | 'quick' | 'whole';
export interface ProgressSaveV1 {
  version: 1;
  selected: number;
  unlocked: number;
  complete: boolean;
  drafts: Record<string, string>;
  solutions: Record<string, string>;
  stars: Record<string, number>;
  story: Record<string, boolean>;
  settings: Settings;
}

export type RobotRole = 'query' | 'prep' | 'floor';
export type ActorId = RobotRole | 'niko';
export type RobotPrograms = Record<RobotRole, string>;
export interface Cargo {
  ticketId: string;
  table: number;
  item: Drink;
  stage: 'claimed' | 'beans' | 'ground' | 'leaves' | 'water' | 'brewed' | 'dirty';
  sugar: number;
  /** A take-away cup has its lid on. */
  lid?: boolean;
}
/** A number, or for Porter a place on the floor it stored with Store from here. */
export type VariableValue = number | readonly [number, number];
/**
 * What a robot is waiting for when its block can't go ahead yet: a guest at the register, a ticket, a drink at pickup,
 * a used cup to clear, a used cup to wash when every clean one is out, or the guest to sit down before serving.
 */
export type WaitReason = 'guest' | 'ticket' | 'drink' | 'used-cup' | 'cup-to-wash' | 'seated';
/**
 * Where a robot is in its innermost For loop: the loop's line, the lap it is on of how many, and for Query the item
 * that lap is on.
 */
export interface LoopPosition {
  line: number;
  pass: number;
  passes: number;
  item?: HeardOrder;
}
export interface ActorSnapshot {
  action?: {
    command: string;
    progress: number;
    start: number;
    waiting?: WaitReason;
    /** The station a Take, Deposit or Use reaches into: "Sugar", "Table 3". */
    at?: string;
  };
  variables?: Record<string, VariableValue | undefined>;
  /** The innermost For loop as of the last finished block. */
  loop?: LoopPosition;
  facing?: number;
  walking?: boolean;
  reach?: number;
  heldPaper?: OrderTicket;
  position: readonly [number, number];
  inventory: Cargo[];
  role: RobotRole;
}
export interface ExecutionEvent {
  variables?: Record<string, VariableValue | undefined>;
  heldPaper?: OrderTicket;
  ticketId?: string;
  seed_id: string;
  actor: ActorId;
  role: RobotRole;
  start: number;
  end: number;
  line: number;
  command: string;
  from: readonly [number, number];
  to: readonly [number, number];
  inventory: Cargo[];
  requested?: number;
  completed?: number;
  error?: string;
  customerId?: string;
  /** What a robot's Take or Deposit did at the station it reached, like SERVE. */ action?: string;
  /** On a zero-length wait record: what the robot is waiting for. */
  waiting?: WaitReason;
  /** The robot's innermost For loop once the block is done, if it is in one. */
  loop?: LoopPosition;
}
export interface SeedExecution {
  seed_id: string;
  start: number;
  duration: number;
  events: ExecutionEvent[];
}
export interface ServiceConfig {
  prepCapacity: number;
  floorCapacity: number;
  clearing: boolean;
  objective: 'serve' | 'prepare' | 'pickup';
  minLoad?: number;
  /** Cups in the whole café; 0 or missing means there are always clean ones. */
  cups?: number;
  /** At closing time Wait for Orders reports Closed, and every robot has to Stop. */
  closing?: boolean;
  /**
   * A table that orders together has all its drinks within this many seconds of the first one; past that, the table
   * gives up waiting. Missing on a shift with no such tables.
   */
  together?: number;
}
export interface ProgressSave extends Omit<ProgressSaveV1, 'version'> {
  version: 4;
  robotDrafts: Record<string, RobotPrograms>;
  robotSolutions: Record<string, RobotPrograms>;
  /** The optional challenges met on each shift, by measure; missing in a café that has met none. */
  challenges?: Record<string, ChallengeMeasure[]>;
  /** The drills got right on the first pick, by id; missing in a café that has none. They never count toward stars. */
  drills?: string[];
  /** Each special's own progress, by id; missing in a café that has played none. */
  specials?: Record<string, SpecialProgress>;
  /** Each memory's own progress, by id, kept like a special's; missing in a café that has played none. */
  memories?: Record<string, SpecialProgress>;
  /** The robots mended on the repair bench, by bench id; missing in a café that has mended none. Nothing is scored. */
  repairs?: string[];
  /**
   * What Niko said at each choice in the story, by choice id: the latest answer, recalled by later scenes. Missing in
   * a café that has answered none. Nothing is scored or locked by it.
   */
  choices?: Record<string, string>;
  /** The Long Day's own progress; missing in a café that has never opened it. */
  endurance?: EnduranceProgress;
}
/**
 * The Long Day, kept apart from the campaign like a special: one set of routines for every wave, the wave the day is
 * on, the furthest wave ever served, and each wave's best stars.
 */
export interface EnduranceProgress {
  /** Which set of waves the day was played on; a day open on another set starts again from the first wave. */
  version: number;
  /** The wave the open day is on, from 1; missing when no day is open. */
  wave?: number;
  /** The furthest wave served, on any day. */
  best?: number;
  /** Each wave's best stars, by wave number. */
  stars?: Record<string, number>;
  /** The day's routines as last written. */
  draft?: RobotPrograms;
  /** The routines the last wave was served with. */
  solution?: RobotPrograms;
}
/** A special's or a memory's progress, kept apart from the campaign's: its stars never count toward the campaign's. */
export interface SpecialProgress {
  /** The routines as last written. */
  draft?: RobotPrograms;
  /** The routines it was last served with. */
  solution?: RobotPrograms;
  stars?: number;
  challenges?: ChallengeMeasure[];
}
