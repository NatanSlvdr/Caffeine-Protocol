import { describe, expect, it } from 'vitest';
import { crewLook } from '@/components/cafe/World';
import { BREW, CUSTOMER_LOOKS, MOKA, NIKO, PIP, PORTER, QUERY, customerLook } from '@/components/cafe/looks';
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

  it('gives each customer a stable look, cycling through the regulars', () => {
    expect(customerLook('C1')).toBe(customerLook('C1'));
    const firstFive = ['C1', 'C2', 'C3', 'C4', 'C5'].map(customerLook);
    expect(new Set(firstFive).size).toBe(CUSTOMER_LOOKS.length);
    expect(firstFive[0].hat?.kind).toBe('flat-cap');
  });
});
