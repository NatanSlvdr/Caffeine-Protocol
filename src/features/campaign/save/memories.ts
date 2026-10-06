import type { ProgressSave, SpecialProgress } from '@/domain/types';
import { put } from './specials';

/**
 * A memory plays in the shift workspace at index `slot`, the shift whose toolkit it borrows, on a café of its own:
 * nothing of the campaign's routines, drafts, stars or challenges is in it, so the workspace opens on the memory's
 * starter routine (or what was last written there) and its earlier versions are only the memory's. What the
 * workspace changes goes back to the memory on the way out (see keepMemory).
 */
export function projectMemory(save: ProgressSave, id: string, slot: number): ProgressSave {
  const kept = save.memories?.[id] ?? {};
  const at = <T>(value: T | undefined): Record<string, T> => (value === undefined ? {} : { [slot]: value });
  const memory: ProgressSave = {
    ...save,
    selected: slot,
    unlocked: slot,
    complete: false,
    drafts: at(kept.draft?.query),
    solutions: at(kept.solution?.query),
    robotDrafts: at(kept.draft),
    robotSolutions: at(kept.solution),
    stars: at(kept.stars),
    ...(kept.challenges?.length && { challenges: { [slot]: kept.challenges } }),
  };
  if (!kept.challenges?.length) delete memory.challenges;
  return memory;
}

/**
 * The save `next`, worked on as `projectMemory` laid it out, back as the campaign keeps it: the shift at `slot` is
 * the memory's progress, and everything the campaign keeps by shift is `before`'s again. Anything else the workspace
 * changed on the way, like the settings, stays changed.
 */
export function keepMemory(next: ProgressSave, before: ProgressSave, id: string, slot: number): ProgressSave {
  const progress: SpecialProgress = {
    ...(next.robotDrafts[slot] && { draft: next.robotDrafts[slot] }),
    ...(next.robotSolutions[slot] && { solution: next.robotSolutions[slot] }),
    ...(next.stars[slot] !== undefined && { stars: next.stars[slot] }),
    ...(next.challenges?.[slot]?.length && { challenges: next.challenges[slot] }),
  };
  const memories = put(before.memories ?? {}, id, Object.keys(progress).length ? progress : undefined);
  const campaign: ProgressSave = {
    ...next,
    selected: before.selected,
    unlocked: before.unlocked,
    complete: before.complete,
    drafts: before.drafts,
    solutions: before.solutions,
    robotDrafts: before.robotDrafts,
    robotSolutions: before.robotSolutions,
    stars: before.stars,
    ...(before.challenges && { challenges: before.challenges }),
  };
  if (!before.challenges) delete campaign.challenges;
  delete campaign.memories;
  return { ...campaign, ...(Object.keys(memories).length && { memories }) };
}
