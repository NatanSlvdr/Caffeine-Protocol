export type Drink = 'coffee' | 'tea';
export interface SpeechIntent { confidence?: 'clear' | 'ambiguous'; drink?: Drink; with_sugar?: boolean; sugar_count?: number; orders?: SpeechIntent[] }
export interface ExpectedTicket { item?: Drink; with_sugar?: boolean; sugar_count?: number }
export interface Customer { customer_id: string; arrival: number; phrase: string; clarification?: string; intent: SpeechIntent; clarification_intent?: SpeechIntent; expected: ExpectedTicket & { tickets?: ExpectedTicket[]; ask_help?: boolean } }
export interface ValidationSeed { id: string; customers: Customer[] }
export interface LevelDefinition { service?:ServiceConfig; act?:number;  id: string; title: string; programming_enabled: boolean; block_target: number; instruction_target: number; reference_block_count: number; seeds: ValidationSeed[]; summary: string; active_tables: number }
export interface Program { source: string; instructions: string[]; source_lines: number[]; ends: Record<number, number>; alternatives: Record<number, number>; positions: Record<string, number>; functions: Record<string, number>; compile_error: string; error_line: number; block_count: number }
export interface TraceStep { line: number; command: string; function_depth: number }
export interface OrderTicket { ticket_id: string; customer_id: string; table_id: string | null; source_phrase: string; source_intent: SpeechIntent; item: string; with_sugar: boolean | null; sugar_count: number | null; status: string; created_at: number; due_at: number; debug_notes: string }
export interface RuntimeState { pc: number; stopped: boolean; counter?: 0 | 1 }
export interface OrderPayment { amount:number; ticketIds:string[] }
export interface CustomerExecution { payment?:OrderPayment;  tickets: OrderTicket[]; asked_help: boolean; error: string; error_line?: number; executed_instructions: number; trace: TraceStep[]; state: RuntimeState }
export interface Timing { arrival: number; created: number; seated: number; ready: number; served: number; left: number; cleaned: number }
export interface ReplayEvent { payment?:OrderPayment;  seed_id: string; customer: Customer; tickets: OrderTicket[]; asked_help: boolean; passed: boolean; reason?: string; trace: TraceStep[]; failure_line?: number; timing: Timing; table: number; satisfaction: number }
export interface RunFailure { role?:RobotRole;  seed_id: string; error_line: number; customer_id: string; event_time: number; phrase: string; intent: SpeechIntent; expected: Customer['expected']; actual: OrderTicket[]; reason: string }
export interface RunResult { execution?:SeedExecution[]; programs?:RobotPrograms;  passed: boolean; observation: boolean; events: ReplayEvent[]; block_count?: number; level_id: string; level_title: string; passed_seeds: number; required_seeds: number; tickets: OrderTicket[]; executed_instructions: number; average_satisfaction: number; stars: number; first_failure: RunFailure | null }
export interface Settings { volume: number; music: number; effects: number; reduced_motion: boolean; pixel_art: boolean; fullscreen: boolean }
export interface ProgressSaveV1 { version: 1; selected: number; unlocked: number; complete: boolean; drafts: Record<string,string>; solutions: Record<string,string>; stars: Record<string,number>; story: Record<string,boolean>; settings: Settings }

export type RobotRole = 'query' | 'prep' | 'floor';
export type ActorId = RobotRole | 'niko';
export type RobotPrograms = Record<RobotRole,string>;
export interface Cargo { ticketId:string; table:number; item:Drink; stage:'claimed'|'beans'|'ground'|'leaves'|'water'|'brewed'|'dirty'; sugar:number }
export interface ActorSnapshot { position:readonly [number,number]; inventory:Cargo[]; battery:number; role:RobotRole }
export interface ExecutionEvent { ticketId?:string;  seed_id:string; actor:ActorId; role:RobotRole; start:number; end:number; line:number; command:string; from:readonly [number,number]; to:readonly [number,number]; inventory:Cargo[]; battery:number; requested?:number; completed?:number; error?:string; customerId?:string }
export interface SeedExecution { seed_id:string; start:number; duration:number; events:ExecutionEvent[] }
export interface ServiceConfig { prepCapacity:number; floorCapacity:number; battery:boolean; clearing:boolean; objective:'serve'|'prepare'|'pickup'; minCharges?:number; minLoad?:number }
export interface ProgressSave extends Omit<ProgressSaveV1,'version'> { version:2; robotDrafts:Record<string,RobotPrograms>; robotSolutions:Record<string,RobotPrograms> }
