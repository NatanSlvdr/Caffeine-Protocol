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

/** Grinding, brewing and steeping are what Use does at the coffee machine, depending on the cup. */
const MACHINE_STEPS = ['GRIND', 'BREW', 'STEEP'];

/** The step the coffee machine runs on this cup, if it can run one. */
export function machineStep(cargo: Pick<Cargo, 'stage' | 'item'>) {
  return MACHINE_STEPS.find((step) => {
    const rule = RECIPE_RULES[step];
    return rule.previous.includes(cargo.stage) && (!rule.item || rule.item === cargo.item);
  });
}

/** A kitchen step as the player writes it, like "Take up water at the sink". */
export function recipeStepLabel(command: string) {
  if (command === 'TAKE BEANS') return 'Take up the beans';
  if (command === 'TAKE LEAVES') return 'Take up the tea leaves';
  if (command === 'FILL WATER') return 'Take up water at the sink';
  if (command === 'GRIND') return 'Use the coffee machine to grind the beans';
  if (command === 'BREW') return 'Use the coffee machine to brew';
  if (command === 'STEEP') return 'Use the coffee machine to steep the tea';
  return command.charAt(0) + command.slice(1).toLowerCase();
}

/** Why the coffee machine has nothing to do with this cup yet. */
export function machineStepError(cargo: Pick<Cargo, 'stage' | 'item'>) {
  return cargo.stage === 'brewed'
    ? `This ${cargo.item} is already brewed: take up sugar or deposit it up at pickup.`
    : `The coffee machine can’t work on this ${cargo.item} yet. ${nextStep(cargo)}`;
}

function nextStep(cargo: Pick<Cargo, 'stage' | 'item'>) {
  const next = Object.entries(RECIPE_RULES).find(
    ([, rule]) => rule.previous.includes(cargo.stage) && (!rule.item || rule.item === cargo.item),
  )?.[0];
  return next ? `Next step: ${recipeStepLabel(next)}.` : 'It’s brewed: take up sugar or deposit it up at pickup.';
}

/** Why a kitchen step can't run yet, naming the step that would. */
export function recipeStepError(command: string, cargo: Pick<Cargo, 'stage' | 'item'>) {
  return `${recipeStepLabel(command)} can’t come next for this ${cargo.item}. ${nextStep(cargo)}`;
}
