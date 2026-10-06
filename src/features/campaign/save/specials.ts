import type { ProgressSave, SpecialProgress } from '@/domain/types';

/**
 * A special plays in the shift workspace as the shift after the campaign's last, at index `slot`: the save it's given
 * has that shift's draft, routines, stars and challenges filled in from the special's own progress, so the routines
 * carried in are the ones the campaign's last shift was served with. What the workspace changes there goes back to
 * the special on the way out (see keepSpecial), and the campaign itself is left as it was.
 */
export function projectSpecial(save: ProgressSave, id: string, slot: number): ProgressSave {
  const kept = save.specials?.[id] ?? {};
  return {
    ...save,
    drafts: put(save.drafts, slot, kept.draft?.query),
    solutions: put(save.solutions, slot, kept.solution?.query),
    robotDrafts: put(save.robotDrafts, slot, kept.draft),
    robotSolutions: put(save.robotSolutions, slot, kept.solution),
    stars: put(save.stars, slot, kept.stars),
    ...withChallenges(put(save.challenges ?? {}, slot, kept.challenges)),
  };
}

/**
 * The save `next`, worked on as `projectSpecial` laid it out, back as the campaign keeps it: the shift at `slot` is
 * the special's progress again, and serving it neither unlocks nor finishes anything that `before` hadn't.
 */
export function keepSpecial(next: ProgressSave, before: ProgressSave, id: string, slot: number): ProgressSave {
  const progress: SpecialProgress = {
    ...(next.robotDrafts[slot] && { draft: next.robotDrafts[slot] }),
    ...(next.robotSolutions[slot] && { solution: next.robotSolutions[slot] }),
    ...(next.stars[slot] !== undefined && { stars: next.stars[slot] }),
    ...(next.challenges?.[slot]?.length && { challenges: next.challenges[slot] }),
  };
  const specials = put(next.specials ?? {}, id, Object.keys(progress).length ? progress : undefined);
  const campaign: ProgressSave = {
    ...next,
    selected: before.selected,
    unlocked: before.unlocked,
    complete: before.complete,
    drafts: put(next.drafts, slot, undefined),
    solutions: put(next.solutions, slot, undefined),
    robotDrafts: put(next.robotDrafts, slot, undefined),
    robotSolutions: put(next.robotSolutions, slot, undefined),
    stars: put(next.stars, slot, undefined),
  };
  delete campaign.challenges;
  delete campaign.specials;
  return {
    ...campaign,
    ...withChallenges(put(next.challenges ?? {}, slot, undefined)),
    ...(Object.keys(specials).length && { specials }),
  };
}

/** The map with `key` set to `value`, or without it when there's none. */
function put<T>(map: Record<string, T>, key: string | number, value: T | undefined): Record<string, T> {
  if (value !== undefined) return { ...map, [key]: value };
  if (!Object.hasOwn(map, key)) return map;
  const rest = { ...map };
  delete rest[key];
  return rest;
}

/** A café with no challenges met leaves the map out. */
const withChallenges = (challenges: NonNullable<ProgressSave['challenges']>) =>
  Object.keys(challenges).length ? { challenges } : {};
