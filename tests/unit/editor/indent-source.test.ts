import { describe, expect, it } from 'vitest';
import { indentSource, tabSource } from '../../../src/domain/scope';
import { compileProgram } from '../../../src/domain/program';

describe('indentSource', () => {
  it('lays out nested scopes and ELSE by depth without changing the program', () => {
    const flat =
      'FUNCTION recipe\nIF coffee\nGRIND\nELSE\nFOR item IN heard orders\nTAKE UP\nEND\nEND\nEND\nCALL recipe';
    const indented = indentSource(flat);
    expect(indented).toBe(
      'FUNCTION recipe\n  IF coffee\n    GRIND\n  ELSE\n    FOR item IN heard orders\n      TAKE UP\n    END\n  END\nEND\nCALL recipe',
    );
    expect(compileProgram(indented).instructions).toEqual(compileProgram(flat).instructions);
  });
  it('never indents below the left margin when ENDs are unbalanced', () => {
    expect(indentSource('END\n  TAKE UP')).toBe('END\nTAKE UP');
  });
});

describe('tabSource', () => {
  it('indents at the cursor, replacing any selection', () => {
    expect(tabSource('IF tea\nTAKE UP', 7, 7, false)).toEqual({ source: 'IF tea\n  TAKE UP', cursor: 9 });
    expect(tabSource('IF tea', 3, 6, false)).toEqual({ source: 'IF   ', cursor: 5 });
  });
  it('outdents the cursor line by one level and stops at the margin', () => {
    expect(tabSource('IF tea\n    TAKE UP', 13, 13, true)).toEqual({ source: 'IF tea\n  TAKE UP', cursor: 11 });
    expect(tabSource('IF tea\n TAKE UP', 8, 8, true)).toEqual({ source: 'IF tea\nTAKE UP', cursor: 7 });
    expect(tabSource('TAKE UP', 3, 3, true)).toEqual({ source: 'TAKE UP', cursor: 3 });
  });
});
