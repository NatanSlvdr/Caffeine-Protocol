import { useCallback, useMemo } from 'react';
import { lessons, CAMPAIGN_LENGTH } from '@/data';
import { drills } from '@/data/drills';
import type { Special } from '@/data/specials';
import type { ProgressSave } from '@/domain';
import { Workspace } from '@/features/workspace/Workspace';
import { completeLevel, keepSpecial, projectSpecial } from '@/features/campaign/save/persistence';
import { useGame } from '@/state/GameStore';
import { go } from '@/shared/lib/navigation';
import { useUntranslated, useWords } from '@/shared/language';
import { SCREEN_WORDS } from './screenWords';

/** The special plays as the shift after the campaign's last, so it opens on the routines that shift was served with. */
const SLOT = CAMPAIGN_LENGTH;

/**
 * A special in the shift workspace. The workspace sees the café as if the special were one more shift, with the
 * special's own progress in that shift's place; everything it changes there is kept with the special, and the
 * campaign's progress and stars are left as they were.
 */
export function SpecialShift({ special }: { special: Special }) {
  const { save, update } = useGame();
  const { id } = special;
  const played = useMemo(() => projectSpecial(save, id, SLOT), [save, id]);
  const keep = useCallback(
    (change: (save: ProgressSave) => ProgressSave) =>
      update((before) => keepSpecial(change(projectSpecial(before, id, SLOT)), before, id, SLOT)),
    [update, id],
  );
  const catalog = useMemo(() => [...lessons, special.lesson], [special]);
  const say = useWords(SCREEN_WORDS);
  const english = useUntranslated();
  return (
    <Workspace
      index={SLOT}
      save={played}
      update={keep}
      lessons={catalog}
      shift={{ ...special, label: special.card ? say.menuCard : say.special, lang: english }}
      drills={drills}
      onNext={() => go('/campaign')}
      onComplete={(stars, querySource, programs, met) =>
        keep((s) => ({
          ...completeLevel(s, SLOT, stars, querySource, catalog, met),
          robotSolutions: { ...s.robotSolutions, [SLOT]: programs },
        }))
      }
    />
  );
}
