import { describe, expect, it } from 'vitest';
import { menuById, specials, type Special } from '../../../src/data/specials';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { Customer, ExpectedTicket, RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';

const cards = specials.filter((special) => special.card?.menu === 'saturday');
const run = (special: Special, programs: RobotPrograms) =>
  runLevel(special.level, compileProgram(programs.query, UNLOCKS.together), programs);
const tickets = (special: Special): ExpectedTicket[] =>
  special.level.seeds.flatMap((seed) =>
    seed.customers.flatMap((guest: Customer) => guest.expected.tickets ?? [guest.expected]),
  );

describe('The Saturday Market, Mr. Albert’s menu', () => {
  it('is chalked up with three cards, each a special of its own', () => {
    expect(menuById('saturday')?.by).toBe('albert');
    expect(cards.map((card) => card.id)).toEqual(['tea-table', 'espresso-bar', 'market-hatch']);
    for (const { level, by } of cards) {
      expect(by).toBe('albert');
      expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
    }
  });

  it.each(cards.map((card) => [card.title, card] as const))(
    '%s is served by its reference for every star, inside its own targets',
    (_, card) => {
      const result = run(card, card.lesson.robotSolution);
      expect(result.first_failure).toBeNull();
      expect(result.passed_seeds).toBe(card.level.seeds.length);
      expect(result.stars).toBe(3);
      expect(result.block_count).toBe(card.level.reference_block_count);
    },
  );

  it.each(cards.map((card) => [card.title, card] as const))(
    '%s is served by Shift 21’s routines, which come in over its block target',
    (_, card) => {
      const result = run(card, referencePrograms(UNLOCKS.together - 1));
      expect(result.passed_seeds).toBe(card.level.seeds.length);
      expect(result.block_count).toBeGreaterThan(card.level.block_target);
      expect(result.stars).toBeLessThan(3);
    },
  );

  it('puts on each card only what the card says', () => {
    const [tea, espresso, hatch] = cards.map(tickets);
    expect(tea.every((ticket) => ticket.item === 'tea')).toBe(true);
    expect(cards[0].level.service?.cups).toBe(4);
    expect(espresso.every((ticket) => ticket.item === 'coffee')).toBe(true);
    expect(espresso.some((ticket) => ticket.rush)).toBe(true);
    expect(hatch.some((ticket) => ticket.to_go)).toBe(true);
    expect(new Set(hatch.map((ticket) => ticket.item))).toEqual(new Set(['coffee', 'tea']));
    expect(cards[2].level.service?.closing).toBe(true);
    // No card brings a rule another card is made of.
    expect([...tea, ...hatch].some((ticket) => ticket.rush)).toBe(false);
    expect([...tea, ...espresso].some((ticket) => ticket.to_go)).toBe(false);
  });
});
