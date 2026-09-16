import { describe, expect, it } from 'vitest';
import { levels, lessons } from '../src/data';
import { DIRECTIONS } from '../src/domain/directions';
import { migrateQuerySource, compileProgram, executeCustomerEvent } from '../src/domain/program';
import { compileRobot } from '../src/domain/robotProgram';
import { referencePrograms } from '../src/data/extension';
import { runLevel } from '../src/domain/simulation';
import { newSave, parseSave } from '../src/domain/persistence';

const customer = levels[2].seeds[0].customers[0];

describe('paper order handoff', () => {
  it('takes paper, moves to the handoff, and deposits it', () => {
    const source = 'LISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
    const execution = executeCustomerEvent(compileProgram(source, 3), customer, 'paper');

    expect(execution.error).toBe('');
    expect(execution.trace.map(step => step.command)).toEqual(source.split('\n'));
    expect(execution.state.counter).toBe(0);
    expect(execution.payment).toEqual({ amount: 3, ticketIds: ['paper_01'] });
  });

  it('accepts all direction chips but enforces the physical handoff directions', () => {
    for (const direction of DIRECTIONS) {
      const pickup = executeCustomerEvent(compileProgram(`LISTEN\nTAKE ${direction}\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1`, 3), customer, 'pickup');
      if (direction === 'UP') expect(pickup.error).toBe('');
      else expect(pickup.error).toContain('No paper in that direction');

      const deposit = executeCustomerEvent(compileProgram(`LISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT ${direction}\nMOVE LEFT 1`, 3), customer, 'deposit');
      if (direction === 'RIGHT') expect(deposit.error).toBe('');
      else expect(deposit.error).toContain('right');
    }
  });

  it('renames old actions while preserving movement in saved Query programs', () => {
    const oldSource = '# saved routine\nPOSITION listen\nLISTEN\nTICKET\nITEM coffee\nMOVE RIGHT 1\nSUBMIT\nMOVE LEFT 1\nJUMP listen';
    const migrated = '# saved routine\nPOSITION listen\nLISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nJUMP listen';
    expect(migrateQuerySource(oldSource)).toBe(migrated);

    const save = { ...newSave(), drafts: { 2: oldSource }, solutions: { 2: oldSource }, robotDrafts: { 2: { query: oldSource, prep: '', floor: '' } }, robotSolutions: {} };
    const restored = parseSave(JSON.stringify(save));
    expect(restored.drafts[2]).toBe(migrated);
    expect(restored.solutions[2]).toBe(migrated);
    expect(restored.robotDrafts[2].query).toBe(migrated);
  });

  it('restores handoff movement only for saves from the stationary pickup version', () => {
    const old = '# routine\nLISTEN\nPICKUP UP\nITEM coffee\nDEPOSIT RIGHT';
    const migrated = '# routine\nLISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
    expect(migrateQuerySource(old)).toBe(migrated);
    expect(migrateQuerySource(migrated)).toBe(migrated);
    expect(migrateQuerySource('LISTEN\nTAKE UP\nITEM coffee\nDEPOSIT RIGHT')).toBe('LISTEN\nTAKE UP\nITEM coffee\nDEPOSIT RIGHT');
  });

  it('requires moving within reach of the handoff counter', () => {
    const result = executeCustomerEvent(compileProgram('LISTEN\nTAKE UP\nITEM coffee\nDEPOSIT RIGHT', 3), customer, 'paper');
    expect(result.error).toContain('Move right to the handoff tile');
    expect(result.error_line).toBe(3);
    expect(result.tickets).toEqual([]);
  });

  it('uses the current tile when taking diagonally and stops movement at obstacles', () => {
    const source = 'LISTEN\nMOVE RIGHT 19\nMOVE RIGHT 1\nMOVE UP 1\nTAKE UP_LEFT\nITEM coffee\nDEPOSIT RIGHT\nMOVE LEFT 1';
    const result = executeCustomerEvent(compileProgram(source, 3), customer, 'paper');
    expect(result.error).toBe('');
    expect(result.state.counter).toBe(0);
    expect(result.tickets[0].item).toBe('coffee');
  });

  it('must return to the register to hear the next customer', () => {
    const source = 'POSITION listen\nLISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nJUMP listen';
    const program = compileProgram(source, 5);
    const first = executeCustomerEvent(program, customer, 'first');
    expect(first.error).toContain('register');
    expect(executeCustomerEvent(program, customer, 'second', first.state).error).toContain('register');
    const returning = compileProgram(source.replace('JUMP listen', 'MOVE LEFT 1\nJUMP listen'), 5);
    const served = executeCustomerEvent(returning, customer, 'first');
    expect(executeCustomerEvent(returning, customer, 'second', served.state).error).toBe('');
  });
});

describe('directional worker handoffs', () => {
  it('uses upward prep deposit and downward floor pickup defaults', () => {
    const prep = referencePrograms(15).prep;
    const floor = referencePrograms(23).floor;
    expect(prep).toContain('DEPOSIT UP');
    expect(floor).toContain('TAKE DOWN');

    const wrongPrep = runLevel(levels[14], compileProgram(referencePrograms(15).query), { ...referencePrograms(15), prep: prep.replace('DEPOSIT UP', 'DEPOSIT RIGHT') });
    expect(wrongPrep.first_failure?.role).toBe('prep');
    expect(wrongPrep.first_failure?.reason).toContain('upward');

    const wrongFloor = runLevel(levels[22], compileProgram(referencePrograms(23).query), { ...referencePrograms(23), floor: floor.replace('TAKE DOWN', 'TAKE UP') });
    expect(wrongFloor.first_failure?.role).toBe('floor');
    expect(wrongFloor.first_failure?.reason).toContain('downward');
  });

  it('executes diagonal MOVE directions for floor robots', () => {
    expect(compileRobot('MOVE UP_LEFT 1', 'floor', 23).compile_error).toBe('');
    const programs = { ...referencePrograms(23), floor: 'MOVE UP_LEFT 1\nMOVE DOWN_RIGHT 1\nWAIT DRINK' };
    const result = runLevel(levels[22], compileProgram(programs.query), programs);
    const edge = result.execution?.[0].events.find(event => event.actor === 'floor' && event.command === 'MOVE UP_LEFT 1' && event.from[0] !== event.to[0]);
    expect(edge?.from).toEqual([6, 3]);
    expect(edge?.to).toEqual([5, 2]);
  });
});

describe('campaign handoff data', () => {
  it('ships canonical Query lessons with movement included in their targets', () => {
    expect(lessons.slice(0, 14).every(lesson => !lesson.solution.includes('TICKET') && !lesson.solution.includes('SUBMIT'))).toBe(true);
    expect(lessons[2].solution).toContain('MOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1');
    expect(levels[2].block_target).toBeGreaterThanOrEqual(6);
    expect(levels[2].instruction_target).toBeGreaterThanOrEqual(12);
  });
});
