import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { availableCommands, compileProgram } from '../../../src/domain/program';
import { compileRobot, robotCommands } from '../../../src/domain/robotProgram';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { UNLOCKS } from '../../../src/domain/unlocks';
import type { RobotPrograms } from '../../../src/domain/types';
import { finishLiveRun, runServiceShift as service } from '../../helpers/run';

/** The Act III programs the player brings into Act IV. */
const actThree = () => referencePrograms(UNLOCKS.toGo - 1);
/** One Act IV shift's reference, with some robots swapped for other programs. */
const mixed = (shift: number, overrides: Partial<RobotPrograms>) => ({ ...referencePrograms(shift), ...overrides });
const reason = (shift: number, overrides: Partial<RobotPrograms>) =>
  service(mixed(shift, overrides), shift).first_failure?.reason;

describe('Act IV unlocks', () => {
  it('opens each rule’s words at its shift', () => {
    expect(availableCommands(UNLOCKS.toGo - 1)).not.toContain('WRITE togo');
    expect(availableCommands(UNLOCKS.toGo)).toContain('WRITE togo');
    expect(availableCommands(UNLOCKS.toGo)).toContain('IF togo IN CUSTOMER SPEECH');
    expect(availableCommands(UNLOCKS.rush - 1)).not.toContain('WRITE rush');
    expect(availableCommands(UNLOCKS.rush)).toContain('WRITE rush');
    expect(availableCommands(UNLOCKS.closing - 1)).not.toContain('STOP');
    expect(availableCommands(UNLOCKS.closing)).toEqual(
      expect.arrayContaining(['STOP', 'IF closed IN CUSTOMER SPEECH']),
    );
    for (const role of ['prep', 'floor'] as const) {
      expect(robotCommands(role, UNLOCKS.toGo - 1)).not.toContain('IF togo IN CUSTOMER SPEECH');
      expect(robotCommands(role, UNLOCKS.toGo)).toContain('IF togo IN CUSTOMER SPEECH');
      expect(robotCommands(role, UNLOCKS.rush)).toContain('IF rush IN CUSTOMER SPEECH');
      expect(robotCommands(role, UNLOCKS.closing - 1)).not.toContain('STOP');
      expect(compileRobot('LISTEN\nSTOP', role, UNLOCKS.closing - 1).compile_error).toContain('Unknown');
      expect(compileRobot('LISTEN\nSTOP', role, UNLOCKS.closing).compile_error).toBe('');
    }
  });
  it.each(levels.slice(UNLOCKS.toGo - 1).map((level, i) => [level.id, UNLOCKS.toGo + i] as const))(
    '%s passes live with its reference programs',
    (_, shift) => {
      const frame = finishLiveRun(createLiveRun(levels[shift - 1], referencePrograms(shift)));
      expect(frame.result.first_failure).toBeNull();
      expect(frame.result.stars).toBe(3);
    },
  );
  it.each(levels.slice(UNLOCKS.toGo - 1).map((level, i) => [level.id, UNLOCKS.toGo + i] as const))(
    '%s breaks the programs from the shift before it',
    (_, shift) => {
      expect(service(referencePrograms(shift - 1), shift).passed).toBe(false);
    },
  );
});

describe('To Go', () => {
  const shift = UNLOCKS.toGo;
  it('needs the mark on the ticket, the lid, and the shelf', () => {
    expect(service(actThree(), shift).first_failure?.reason).toMatch(/is to go: Write To go on it/);
    const withMarks = { query: referencePrograms(shift).query };
    expect(reason(shift, { ...actThree(), ...withMarks })).toMatch(/is to go: put a lid on it first/);
    expect(reason(shift, { floor: actThree().floor })).toMatch(/is to go: it has no table/);
  });
  it('keeps lids off drinks that stay in', () => {
    const prep = referencePrograms(shift).prep.replace('IF togo IN CUSTOMER SPEECH\nTAKE UP\nEND', 'TAKE UP');
    expect(reason(shift, { prep })).toMatch(/is staying in: it doesn’t need a lid/);
  });
  it('hands take-away drinks over at the shelf, with no table and nothing to clear', () => {
    const r = service({}, shift);
    expect(r.first_failure).toBeNull();
    const takeAway = r.events.filter((event) => event.customer.expected.to_go);
    expect(takeAway.length).toBeGreaterThan(0);
    for (const event of takeAway) {
      expect(event.table).toBe(0);
      expect(event.tickets.every((ticket) => ticket.to_go && ticket.table_id === null)).toBe(true);
      expect(event.timing.cleaned).toBe(event.timing.served);
    }
    const handovers = r.execution![0].events.filter((e) => e.action === 'HAND OVER' && e.end > e.start);
    expect(handovers).toHaveLength(takeAway.length);
    expect(r.execution![0].events.some((e) => e.action === 'LID')).toBe(true);
  });
  it('keeps table drinks off the shelf', () => {
    const floor = referencePrograms(shift).floor.replace('IF togo IN CUSTOMER SPEECH', 'IF coffee IN CUSTOMER SPEECH');
    expect(reason(shift, { floor })).toMatch(
      /is (for table \d+, not the to-go shelf|to go: take it to the to-go shelf)/,
    );
  });
});

describe('Four Cups', () => {
  const shift = UNLOCKS.cups;
  it('runs out of cups unless Brew washes the used ones', () => {
    expect(reason(shift, { prep: actThree().prep })).toBe(
      'There are no clean cups left: all 4 are in use. Wash the used ones first: Use up at the sink.',
    );
    const r = service({}, shift);
    expect(r.first_failure).toBeNull();
    expect(r.execution![0].events.some((e) => e.action === 'WASH' && e.end - e.start === 2)).toBe(true);
  });
  it('stalls with Brew at the sink when Porter never brings the cups back', () => {
    const floor = referencePrograms(shift).floor.replace('CALL clear\n', '');
    expect(reason(shift, { floor })).toBe(
      'Brew is waiting at the sink for a used cup, but none are coming back: all 4 cups are out. Porter has to bring them back.',
    );
  });
  it('lets washing an empty sink pass harmlessly when cups are plentiful', () => {
    expect(service({ prep: referencePrograms(shift).prep }, UNLOCKS.rush).first_failure?.role).not.toBe('prep');
  });
});

describe('In a Hurry', () => {
  const shift = UNLOCKS.rush;
  it('needs the rush mark, and no batching around a rush order', () => {
    expect(service(actThree(), shift).first_failure?.reason).toMatch(/is for someone in a rush: Write Rush on it/);
    const query = { query: referencePrograms(shift).query };
    expect(reason(shift, { ...actThree(), ...query })).toMatch(
      /is for someone in a rush: make it before waiting for another ticket/,
    );
    expect(reason(shift, { floor: actThree().floor })).toMatch(
      /is for someone in a rush: serve it before anything else/,
    );
  });
  it('lets rush tickets jump the kitchen queue', () => {
    const r = service({}, shift);
    expect(r.first_failure).toBeNull();
    const claims = r.execution![0].events.filter((e) => e.role === 'prep' && e.command === 'LISTEN' && e.ticketId);
    const rushIds = new Set(r.tickets.filter((ticket) => ticket.rush).map((ticket) => ticket.ticket_id));
    const order = claims.map((claim) => claim.ticketId!);
    // Every rush ticket was claimed no later than the non-rush tickets written before it.
    for (const id of rushIds) {
      const written = r.tickets.findIndex((ticket) => ticket.ticket_id === id);
      const earlier = r.tickets.slice(0, written).filter((ticket) => !ticket.rush && order.includes(ticket.ticket_id));
      expect(earlier.some((ticket) => order.indexOf(ticket.ticket_id) > order.indexOf(id))).toBe(true);
    }
  });
});

describe('Last Orders', () => {
  const shift = UNLOCKS.closing;
  it('makes every robot stop at closing time', () => {
    expect(service(actThree(), shift).first_failure?.reason).toBe(
      'It’s closing time: there’s nobody left to write a ticket for.',
    );
    expect(reason(shift, { prep: actThree().prep })).toBe(
      'The café is closed and Brew has nothing left to do: after Wait for Orders, check If Closed IN Orders and Stop.',
    );
    expect(reason(shift, { floor: actThree().floor })).toMatch(
      /^The café is closed, so nothing more is coming: after Wait for Orders, check If Closed IN Orders, finish the (coffee|tea) Porter holds, and Stop\.$/,
    );
  });
  it('keeps Query listening until closing time', () => {
    const query = referencePrograms(shift).query.replace('JUMP listen', 'STOP');
    expect(service({ query }, shift).first_failure?.reason).toContain('stopped listening');
  });
  it('refuses to stop a robot before closing time', () => {
    const prep = referencePrograms(shift).prep.replace('REPEAT', 'STOP\nREPEAT');
    expect(reason(shift, { prep })).toMatch(/^It isn’t closing time yet: Brew still has work coming/);
  });
  it('fails a robot that waits again after closing', () => {
    const prep = referencePrograms(shift).prep.replace(
      'IF closed IN CUSTOMER SPEECH\nSTOP\nEND',
      'IF closed IN CUSTOMER SPEECH\nLISTEN\nEND',
    );
    expect(reason(shift, { prep })).toBe('The café is closed: Stop Brew instead of waiting for more orders.');
  });
  it('fails live when Query keeps listening at closing time', () => {
    const programs = mixed(shift, { query: actThree().query });
    const frame = finishLiveRun(createLiveRun(levels[shift - 1], programs));
    expect(frame.result.first_failure?.reason).toBe('It’s closing time: there’s nobody left to write a ticket for.');
  });
});

describe('Espresso Yourself', () => {
  it('uses paper cups for take-away, so four café cups are enough for every rule at once', () => {
    const r = service({}, levels.length);
    expect(r.first_failure).toBeNull();
    const logs = r.execution![0].events;
    for (const action of ['LID', 'HAND OVER', 'WASH']) expect(logs.some((e) => e.action === action)).toBe(true);
    expect(logs.some((e) => e.command === 'STOP')).toBe(true);
  });
  it('compiles every Act IV reference at its own shift', () => {
    for (let shift = UNLOCKS.toGo; shift <= levels.length; shift++) {
      const programs = referencePrograms(shift);
      expect(compileProgram(programs.query, shift).compile_error).toBe('');
      expect(compileRobot(programs.prep, 'prep', shift).compile_error).toBe('');
      expect(compileRobot(programs.floor, 'floor', shift).compile_error).toBe('');
    }
  });
});
