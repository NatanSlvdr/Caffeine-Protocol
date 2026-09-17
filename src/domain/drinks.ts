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
