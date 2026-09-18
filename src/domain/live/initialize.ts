import { compileProgram } from '../program';
import { QUERY_PROGRAM_LEVEL_CAP } from '../constants';
import { tableForShift } from '../scoring';
import type { LevelDefinition, Program, ReplayEvent, RobotPrograms } from '../types';

export interface LiveRunInit {
  program: Program;
  number: number;
  events: ReplayEvent[];
  listenLine: number;
  queryNext: number;
}

/** Compile the query program and seed per-customer events; executes no player instruction. */
export function initializeLiveRun(level: LevelDefinition, programs: RobotPrograms, seedIndex = 0): LiveRunInit {
  const program = compileProgram(programs.query, Math.min(Number(level.id.slice(1)), QUERY_PROGRAM_LEVEL_CAP));
  const number = Number(level.id.slice(1));
  const seed = level.seeds[seedIndex] ?? level.seeds[0];
  const events = seed.customers.map((customer, i): ReplayEvent => ({
    seed_id: seed.id,
    customer: structuredClone(customer),
    tickets: [],
    trace: [],
    asked_help: false,
    passed: true,
    table: tableForShift(i, level.active_tables),
    satisfaction: 100,
    timing: {
      arrival: customer.arrival,
      created: Infinity,
      seated: Infinity,
      ready: Infinity,
      served: Infinity,
      left: Infinity,
      cleaned: Infinity,
    },
  }));
  const listenIndex = program.instructions.findIndex((command) => command === 'LISTEN');
  const listenLine = listenIndex >= 0 ? program.source_lines[listenIndex] : -1;
  return { program, number, events, listenLine, queryNext: seed.customers[0]?.arrival ?? Infinity };
}
