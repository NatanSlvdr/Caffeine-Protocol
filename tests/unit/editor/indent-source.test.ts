import { describe, expect, it } from 'vitest';
import { indentSource } from '../../../src/domain/scope';
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
