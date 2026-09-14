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
  it('uses paper pickup and deposit without counter movement', () => {
    const source = 'LISTEN\nPICKUP UP\nITEM coffee\nDEPOSIT RIGHT';
    const execution = executeCustomerEvent(compileProgram(source, 3), customer, 'paper');

    expect(execution.error).toBe('');
    expect(execution.trace.map(step => step.command)).toEqual(['LISTEN', 'PICKUP UP', 'ITEM coffee', 'DEPOSIT RIGHT']);
    expect(execution.state.counter).toBeUndefined();
    expect(execution.payment).toEqual({ amount: 3, ticketIds: ['paper_01'] });
  });

  it('accepts all direction chips but enforces the physical handoff directions', () => {
    for (const direction of DIRECTIONS) {
      const pickup = executeCustomerEvent(compileProgram(`LISTEN\nPICKUP ${direction}\nITEM coffee\nDEPOSIT RIGHT`, 3), customer, 'pickup');
      if (direction === 'UP') expect(pickup.error).toBe('');
      else expect(pickup.error).toContain('up direction');

      const deposit = executeCustomerEvent(compileProgram(`LISTEN\nPICKUP UP\nITEM coffee\nDEPOSIT ${direction}`, 3), customer, 'deposit');
      if (direction === 'RIGHT') expect(deposit.error).toBe('');
      else expect(deposit.error).toContain('right');
    }
  });

  it('migrates the old exact right-submit-left sequence in saved Query programs', () => {
    const oldSource = '# saved routine\nPOSITION listen\nLISTEN\nTICKET\nITEM coffee\nMOVE RIGHT 1\nSUBMIT\nMOVE LEFT 1\nJUMP listen';
    const migrated = '# saved routine\nPOSITION listen\nLISTEN\nPICKUP UP\nITEM coffee\nDEPOSIT RIGHT\nJUMP listen';
    expect(migrateQuerySource(oldSource)).toBe(migrated);

    const save = { ...newSave(), drafts: { 2: oldSource }, solutions: { 2: oldSource }, robotDrafts: { 2: { query: oldSource, prep: '', floor: '' } }, robotSolutions: {} };
    const restored = parseSave(JSON.stringify(save));
    expect(restored.drafts[2]).toBe(migrated);
    expect(restored.solutions[2]).toBe(migrated);
    expect(restored.robotDrafts[2].query).toBe(migrated);
  });
});

describe('directional worker handoffs', () => {
  it('uses upward prep deposit and downward floor pickup defaults', () => {
    const prep = referencePrograms(15).prep;
    const floor = referencePrograms(23).floor;
    expect(prep).toContain('DEPOSIT UP');
    expect(floor).toContain('PICKUP DOWN');

    const wrongPrep = runLevel(levels[14], compileProgram(referencePrograms(15).query), { ...referencePrograms(15), prep: prep.replace('DEPOSIT UP', 'DEPOSIT RIGHT') });
    expect(wrongPrep.first_failure?.role).toBe('prep');
    expect(wrongPrep.first_failure?.reason).toContain('upward');

    const wrongFloor = runLevel(levels[22], compileProgram(referencePrograms(23).query), { ...referencePrograms(23), floor: floor.replace('PICKUP DOWN', 'PICKUP UP') });
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
  it('ships canonical Query lessons and keeps their targets free of retired handoff padding', () => {
    expect(lessons.slice(0, 14).every(lesson => !lesson.solution.includes('TICKET') && !lesson.solution.includes('SUBMIT'))).toBe(true);
    expect(levels[2].block_target).toBe(5);
    expect(levels[2].instruction_target).toBe(20);
  });
});
