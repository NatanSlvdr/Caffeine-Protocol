import type { EnduranceProgress, ProgressSave, SpecialProgress } from '@/domain/types';
import { keepSpecial, projectSpecial, put } from './specials';

/** Where the day sits among the specials while a wave is in the workspace; never kept there. */
const KEY = 'long-day';

/**
 * A wave of the Long Day plays like a special, as the shift after the campaign's last at index `slot`: the day's
 * routines, the same for every wave, and that wave's own best stars. What the workspace changes there goes back to
 * the day on the way out (see keepEndurance).
 */
export function projectEndurance(save: ProgressSave, wave: number, slot: number): ProgressSave {
  const day = save.endurance;
  const progress: SpecialProgress = {
    ...(day?.draft && { draft: day.draft }),
    ...(day?.solution && { solution: day.solution }),
    ...(day?.stars?.[wave] !== undefined && { stars: day.stars[wave] }),
  };
  return projectSpecial({ ...save, specials: { ...save.specials, [KEY]: progress } }, KEY, slot);
}

/**
 * The save `next`, worked on as `projectEndurance` laid it out, back as the café keeps it: the routines are the day's,
 * the stars are the wave's, and a wave served with any is the furthest one served if none further was. The specials
 * and the campaign are `before`'s again; challenges aren't kept for a wave.
 */
export function keepEndurance(next: ProgressSave, before: ProgressSave, wave: number, slot: number): ProgressSave {
  const kept = keepSpecial(next, before, KEY, slot);
  const progress = kept.specials?.[KEY] ?? {};
  const day = before.endurance ?? { version: 0 };
  const stars = put(day.stars ?? {}, wave, progress.stars);
  const served = progress.stars !== undefined;
  const endurance: EnduranceProgress = {
    version: day.version,
    ...(day.wave !== undefined && { wave: day.wave }),
    ...((served || day.best !== undefined) && { best: Math.max(day.best ?? 0, served ? wave : 0) }),
    ...(Object.keys(stars).length && { stars }),
    ...(progress.draft && { draft: progress.draft }),
    ...(progress.solution && { solution: progress.solution }),
  };
  const result: ProgressSave = { ...kept, endurance };
  if (before.specials) result.specials = before.specials;
  else delete result.specials;
  return result;
}

/**
 * The day opened from its first wave, on the set of waves `version`. The routines carry over from any earlier day;
 * so do the stars and the furthest wave, unless they were earned on another set of waves.
 */
export function startDay(save: ProgressSave, version: number): ProgressSave {
  const day = save.endurance;
  const same = day?.version === version;
  return {
    ...save,
    endurance: {
      version,
      wave: 1,
      ...(same && day.best !== undefined && { best: day.best }),
      ...(same && day.stars && { stars: day.stars }),
      ...(day?.draft && { draft: day.draft }),
      ...(day?.solution && { solution: day.solution }),
    },
  };
}

/**
 * The day once wave `wave` of `waves` is served: on to the next wave if the open day was on this one, or over after
 * the last. A wave served again, behind the open day's or with none open, moves nothing.
 */
export function servedWave(save: ProgressSave, wave: number, waves: number): ProgressSave {
  const day = save.endurance;
  if (day?.wave !== wave) return save;
  if (wave >= waves) return closeDay(save);
  return { ...save, endurance: { ...day, wave: wave + 1 } };
}

/** The day over: its routines, stars and furthest wave are kept for the next one. */
function closeDay(save: ProgressSave): ProgressSave {
  if (save.endurance?.wave === undefined) return save;
  const rest = { ...save.endurance };
  delete rest.wave;
  return { ...save, endurance: rest };
}

/**
 * Whether wave `wave` can be opened on the waves `version`: the open day's wave, or any wave served before on them.
 */
export function waveOpen(save: Pick<ProgressSave, 'endurance'>, wave: number, version: number): boolean {
  const day = save.endurance;
  return (
    day?.version === version && Number.isInteger(wave) && wave >= 1 && (wave === day.wave || wave <= (day.best ?? 0))
  );
}
