import { describe, expect, it } from 'vitest';
import { crewLook } from '@/components/cafe/World';
import { BREW, MOKA, NIKO, PIP, PORTER, QUERY, REGULAR_LOOKS, customerLook } from '@/components/cafe/looks';
import { ROBOT_UNLOCK_LEVELS } from '@/domain';

describe('cast looks in the café', () => {
  it('draws each post as its robot once unlocked, otherwise as the human stand-in', () => {
    const before = ROBOT_UNLOCK_LEVELS.prep - 1;
    expect(crewLook('niko', 1)).toEqual({ human: NIKO });
    expect(crewLook('query', 1)).toEqual({ robot: QUERY });
    expect(crewLook('prep', before)).toEqual({ human: MOKA });
    expect(crewLook('prep', ROBOT_UNLOCK_LEVELS.prep)).toEqual({ robot: BREW });
    expect(crewLook('floor', ROBOT_UNLOCK_LEVELS.floor - 1)).toEqual({ human: PIP });
    expect(crewLook('floor', ROBOT_UNLOCK_LEVELS.floor)).toEqual({ robot: PORTER });
  });

  it('gives each guest a stable look, varied among the plain guests and never a regular’s', () => {
    expect(customerLook('C1')).toBe(customerLook('C1'));
    const guests = ['C1', 'C2', 'C3', 'C4'].map((id) => customerLook(id));
    expect(new Set(guests).size).toBe(4);
    for (const look of guests) expect(Object.values(REGULAR_LOOKS)).not.toContain(look);
  });

  it('draws a regular as themselves, whoever’s id they arrive under', () => {
    expect(customerLook('C3', 'albert')).toBe(REGULAR_LOOKS.albert);
    expect(customerLook('C9', 'albert').hat?.kind).toBe('flat-cap');
    expect(customerLook('C1', 'juno').headphones).toBeDefined();
  });
});
