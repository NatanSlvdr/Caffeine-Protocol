import type { Cargo } from './types';
import type { Point } from './layout';
import { STATIONS } from './layout';

/** One recipe step: where it runs, which stage it produces, and what it accepts. */
export interface RecipeRule {
  point: Point;
  stage: Cargo['stage'];
  previous: Cargo['stage'][];
  item?: Cargo['item'];
  duration?: number;
}

/** Single source of truth for kitchen recipes shared by the service runtime and reference programs. */
export const RECIPE_RULES: Record<string, RecipeRule> = {
  'TAKE BEANS': { point: STATIONS.ingredients.prep, stage: 'beans', previous: ['claimed'], item: 'coffee' },
  'TAKE LEAVES': { point: STATIONS.ingredients.prep, stage: 'leaves', previous: ['claimed'], item: 'tea' },
  GRIND: { point: STATIONS.grinder.prep, stage: 'ground', previous: ['beans'], duration: 2 },
  'FILL WATER': { point: STATIONS.water.prep, stage: 'water', previous: ['ground', 'leaves'] },
  BREW: { point: STATIONS.brewer.prep, stage: 'brewed', previous: ['water'], item: 'coffee', duration: 6 },
  STEEP: { point: STATIONS.brewer.prep, stage: 'brewed', previous: ['water'], item: 'tea', duration: 7 },
};

/** A kitchen command as its block reads, like "Fill water". */
export function recipeStepLabel(command: string) {
  if (command === 'TAKE BEANS') return 'Take up the beans';
  if (command === 'TAKE LEAVES') return 'Take up the tea leaves';
  return command.charAt(0) + command.slice(1).toLowerCase();
}

/** Why a kitchen step can't run yet, naming the step that would. */
export function recipeStepError(command: string, cargo: Pick<Cargo, 'stage' | 'item'>) {
  const next = Object.entries(RECIPE_RULES).find(
    ([, rule]) => rule.previous.includes(cargo.stage) && (!rule.item || rule.item === cargo.item),
  )?.[0];
  return `${recipeStepLabel(command)} can’t come next for this ${cargo.item}. ${
    next ? `Next step: ${recipeStepLabel(next)}.` : 'It’s brewed: add sugar or deposit it.'
  }`;
}
