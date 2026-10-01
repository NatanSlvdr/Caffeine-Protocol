import { describe, expect, it } from 'vitest';
import { referencePrograms } from '../../../src/data/extension';
import { compileRobot, migrateRobotSource, robotCommands } from '../../../src/domain/robotProgram';
import { isWalkable, tableFront } from '../../../src/domain/layout';
import { runServiceShift as service } from '../../helpers/run';
import { levels } from '../../../src/data';
import { UNLOCKS } from '../../../src/domain/unlocks';

/** Porter's last Act III shift: four tables and a two-drink tray. */
const FLOOR_TRAY = 16;

describe('Brew and Porter speak Query’s language', () => {
  it('offers Query’s wait, take, deposit, condition, and jump blocks to both robots', () => {
    for (const role of ['prep', 'floor'] as const) {
      const commands = robotCommands(role, UNLOCKS.floor);
      for (const command of [
        'LISTEN',
        'TAKE UP',
        'DEPOSIT UP',
        'IF sugar IN CUSTOMER SPEECH',
        'POSITION listen',
        'JUMP listen',
      ])
        expect(commands).toContain(command);
      expect(commands).not.toContain('REPEAT');
    }
  });

  it('retires the station verbs and reads conditions against the robot’s order only', () => {
    for (const command of [
      'WAIT TICKET',
      'FILL WATER',
      'ADD SUGAR',
      'TAKE BEANS',
      'DEPOSIT',
      'IF coffee',
      'GRIND',
      'BREW',
      'STEEP',
    ])
      expect(compileRobot(command, 'prep', UNLOCKS.floor).compile_error).toContain('Unknown');
    for (const command of [
      'WAIT DRINK',
      'PICKUP',
      'SERVE',
      'COLLECT',
      'RETURN CUPS',
      'USE UP',
      'STORE var1 FROM sugar',
    ])
      expect(compileRobot(command, 'floor', UNLOCKS.floor).compile_error).toContain('Unknown');
    expect(
      compileRobot('IF tea NOT IN CUSTOMER SPEECH OR sugar IN CUSTOMER SPEECH\nEND', 'prep', UNLOCKS.functions)
        .compile_error,
    ).toBe('');
    expect(compileRobot('IF negation IN CUSTOMER SPEECH\nEND', 'prep', UNLOCKS.functions).compile_error).toContain(
      'Unknown',
    );
  });

  it('checks that every Jump has its Position', () => {
    expect(compileRobot('LISTEN\nJUMP listen', 'prep', UNLOCKS.functions).compile_error).toBe(
      'Jump target has no matching Position block.',
    );
  });

  it('lets the station a robot faces decide what Take and Deposit do', () => {
    const r = service({}, FLOOR_TRAY),
      logs = r.execution![0].events;
    const actions = (role: 'prep' | 'floor') =>
      new Set(logs.filter((e) => e.role === role && e.action).map((e) => `${e.command} → ${e.action}`));
    expect(actions('prep')).toEqual(
      new Set([
        'TAKE UP → TAKE',
        'TAKE UP → FILL WATER',
        'TAKE UP → ADD SUGAR',
        'DEPOSIT UP → DEPOSIT',
        'USE UP → GRIND',
        'USE UP → BREW',
        'USE UP → STEEP',
      ]),
    );
    expect(actions('floor')).toEqual(
      new Set(['TAKE DOWN → PICKUP', 'DEPOSIT UP → SERVE', 'TAKE UP → COLLECT', 'DEPOSIT DOWN → RETURN CUPS']),
    );
  });
});

describe('Brew’s coffee machine and sugar', () => {
  it('runs the machine step the cup needs with Use', () => {
    const logs = service({}, FLOOR_TRAY).execution![0].events.filter((e) => e.command === 'USE UP');
    for (const e of logs) {
      const cup = e.inventory.find((c) => c.ticketId === e.ticketId);
      expect(cup?.stage).toBe(e.action === 'GRIND' ? 'ground' : 'brewed');
    }
  });

  it('stores the order’s sugar and counts it in one cube per Take up', () => {
    expect(robotCommands('prep', UNLOCKS.prepSugar - 1)).not.toContain('FOR var1 TIMES');
    expect(robotCommands('prep', UNLOCKS.prepSugar)).toEqual(
      expect.arrayContaining(['STORE var1 FROM sugar', 'FOR var1 TIMES']),
    );
    const logs = service({}).execution![0].events.filter((e) => e.role === 'prep');
    const sugared = logs.filter((e) => e.action === 'ADD SUGAR');
    expect(sugared.length).toBeGreaterThan(0);
    for (const e of sugared) {
      const cup = e.inventory.find((c) => c.ticketId === e.ticketId)!;
      const before = logs.filter((l) => l.ticketId === e.ticketId && l.action === 'ADD SUGAR' && l.end < e.end).length;
      expect(cup.sugar).toBe(before + 1);
    }
  });

  it('refuses a cube the order didn’t ask for', () => {
    const prep = referencePrograms(levels.length).prep.replace(
      'FOR var1 TIMES\nTAKE UP\nEND',
      'TAKE UP\nTAKE UP\nTAKE UP',
    );
    expect(service({ prep }).first_failure?.reason).toMatch(
      /takes (no sugar|\d sugar cubes?, and it already has them)/,
    );
  });

  it('asks for a stored number before counting', () => {
    const prep = referencePrograms(levels.length).prep.replace('STORE var1 FROM sugar', 'FOR var2 TIMES\nEND');
    expect(service({ prep }).first_failure?.reason).toBe('Store a number in Var B before looping on it.');
  });
});

describe('Porter’s table and place memory', () => {
  it('walks to the table in a variable around the furniture, then back to its stored place', () => {
    const logs = service({}, FLOOR_TRAY).execution![0].events.filter((e) => e.role === 'floor');
    const walks = logs.filter((e) => /^MOVE var[12]$/.test(e.command) && e.from.join() !== e.to.join());
    expect(walks.length).toBeGreaterThan(0);
    for (const e of walks) {
      expect(Math.abs(e.to[0] - e.from[0]) + Math.abs(e.to[1] - e.from[1])).toBe(1);
      expect(isWalkable(e.to, 'floor')).toBe(true);
    }
    for (const serve of logs.filter((e) => e.action === 'SERVE')) {
      const table = serve.variables?.var1 as number;
      expect(serve.from).toEqual(tableFront(table - 1));
      expect(serve.variables?.var2).toEqual([6, 3]);
    }
  });

  it('explains a variable that holds no table', () => {
    const floor = referencePrograms(FLOOR_TRAY).floor.replace('STORE var1 FROM table\nMOVE var1', 'MOVE var3');
    expect(service({ floor }, FLOOR_TRAY).first_failure?.reason).toBe(
      'Store a table or a place in Var C before moving to it.',
    );
  });

  it('keeps accepting table checks from older saves without offering them', () => {
    expect(robotCommands('floor', FLOOR_TRAY).some((c) => c.startsWith('IF TABLE'))).toBe(false);
    expect(compileRobot('IF TABLE 3\nEND', 'floor', FLOOR_TRAY).compile_error).toBe('');
  });
});

describe('saved Brew and Porter programs', () => {
  it('rewrite retired verbs into the shared ones, keeping indentation and comments', () => {
    expect(
      migrateRobotSource(
        '# brew\nWAIT TICKET\nIF coffee\n  TAKE BEANS\n  GRIND\nELSE\n  TAKE LEAVES\nEND\nFILL WATER\nBREW\nADD SUGAR\nDEPOSIT',
        'prep',
      ),
    ).toBe(
      '# brew\nLISTEN\nIF coffee IN CUSTOMER SPEECH\n  TAKE UP\n  USE UP\nELSE\n  TAKE UP\nEND\nTAKE UP\nUSE UP\nTAKE UP\nDEPOSIT UP',
    );
    expect(migrateRobotSource('WAIT DRINK\nPICKUP\n  SERVE\nWAIT DIRTY\nCOLLECT\nRETURN CUPS', 'floor')).toBe(
      'LISTEN\nTAKE DOWN\n  DEPOSIT UP\nWAIT DIRTY\nTAKE UP\nDEPOSIT DOWN',
    );
  });

  it('turn equality checks against the order into membership', () => {
    const migrate = (command: string) => migrateRobotSource(command, 'prep');
    expect(migrate('IF coffee = CUSTOMER SPEECH')).toBe('IF coffee IN CUSTOMER SPEECH');
    expect(migrate('IF tea != CUSTOMER SPEECH')).toBe('IF tea NOT IN CUSTOMER SPEECH');
    expect(migrate('IF sugar = TRUE')).toBe('IF sugar IN CUSTOMER SPEECH');
    expect(migrate('IF sugar = FALSE')).toBe('IF sugar NOT IN CUSTOMER SPEECH');
    // Sugar counts have no Query equivalent; they keep running as they were.
    expect(migrate('IF count = 2')).toBe('IF count = 2');
  });
});
