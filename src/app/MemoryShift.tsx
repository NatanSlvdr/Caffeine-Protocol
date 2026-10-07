import { useCallback, useMemo } from 'react';
import { lessons } from '@/data';
import { memoryIn, type Memory } from '@/data/memories';
import type { ProgressSave } from '@/domain';
import { shiftNumber } from '@/domain/unlocks';
import { Workspace } from '@/features/workspace/Workspace';
import { completeLevel, keepMemory, projectMemory } from '@/features/campaign/save/persistence';
import { useGame } from '@/state/GameStore';
import { useMusicMood } from '@/hooks/useMusicMood';
import { go } from '@/shared/lib/navigation';
import { useLanguage, useWords } from '@/shared/language';
import { SCREEN_WORDS } from './screenWords';

/**
 * A memory in the shift workspace. It plays in the place of the shift whose toolkit it borrows, on a café of its own
 * that holds only the memory's progress: it opens on the memory's starter, never on the café's routines, and what it
 * changes is kept with the memory. The campaign's progress and stars are left as they were.
 */
export function MemoryShift({ memory: kept }: { memory: Memory }) {
  const { save, update } = useGame();
  const memory = memoryIn(kept, useLanguage()[0]);
  // Lou's café, two winters ago, plays like an old record.
  useMusicMood('memory');
  const { id } = memory;
  const slot = shiftNumber(memory.level.id) - 1;
  const played = useMemo(() => projectMemory(save, id, slot), [save, id, slot]);
  const keep = useCallback(
    (change: (save: ProgressSave) => ProgressSave) =>
      update((before) => keepMemory(change(projectMemory(before, id, slot)), before, id, slot)),
    [update, id, slot],
  );
  const catalog = useMemo(
    () => lessons.map((lesson, index) => (index === slot ? memory.lesson : lesson)),
    [memory, slot],
  );
  const say = useWords(SCREEN_WORDS);
  return (
    <Workspace
      index={slot}
      save={played}
      update={keep}
      lessons={catalog}
      shift={{ ...memory, label: say.memory, memory: true }}
      onNext={() => go('/campaign')}
      onComplete={(stars, querySource, programs, met) =>
        keep((s) => ({
          ...completeLevel(s, slot, stars, querySource, catalog, met),
          robotSolutions: { ...s.robotSolutions, [slot]: programs },
        }))
      }
    />
  );
}
