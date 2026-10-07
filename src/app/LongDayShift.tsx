import { useCallback, useMemo } from 'react';
import { lessons, CAMPAIGN_LENGTH } from '@/data';
import { drills } from '@/data/drills';
import { longDay, waveThanks } from '@/data/longDay';
import type { ProgressSave } from '@/domain';
import { Workspace } from '@/features/workspace/Workspace';
import { completeLevel, keepEndurance, projectEndurance, servedWave } from '@/features/campaign/save/persistence';
import { useGame } from '@/state/GameStore';
import { go } from '@/shared/lib/navigation';
import { useWords } from '@/shared/language';
import { SCREEN_WORDS } from './screenWords';

/** Every wave plays as the shift after the campaign's last, like a special, so the day opens on its routines. */
const SLOT = CAMPAIGN_LENGTH;

/**
 * A wave of the Long Day in the shift workspace. The waves share one set of routines, kept with the day; each keeps
 * its own stars. Serving the open day's wave moves the day on to the next, so stopping on the receipt carries on from
 * there later.
 */
export function LongDayShift({ number }: { number: number }) {
  const { save, update } = useGame();
  const wave = longDay.waves[number - 1];
  const last = wave.number === longDay.waves.length;
  const played = useMemo(() => projectEndurance(save, wave.number, SLOT), [save, wave.number]);
  const keep = useCallback(
    (change: (save: ProgressSave) => ProgressSave) =>
      update((before) => keepEndurance(change(projectEndurance(before, wave.number, SLOT)), before, wave.number, SLOT)),
    [update, wave.number],
  );
  const catalog = useMemo(() => [...lessons, wave.lesson], [wave]);
  const say = useWords(SCREEN_WORDS);
  return (
    <Workspace
      index={SLOT}
      save={played}
      update={keep}
      lessons={catalog}
      shift={{ ...wave, label: say.wave(wave.number, longDay.waves.length), thanks: waveThanks(wave.number) }}
      drills={drills}
      onward={last ? undefined : { next: say.nextWave, stop: say.stop, onStop: () => go('/campaign') }}
      onNext={() => go(last ? '/campaign' : `/${longDay.id}/${wave.number + 1}`)}
      onComplete={(stars, querySource, programs, met) => {
        keep((s) => ({
          ...completeLevel(s, SLOT, stars, querySource, catalog, met),
          robotSolutions: { ...s.robotSolutions, [SLOT]: programs },
        }));
        update((s) => servedWave(s, wave.number, longDay.waves.length));
      }}
    />
  );
}
