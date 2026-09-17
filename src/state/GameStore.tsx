import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { lessons, levels, titleFor, CAMPAIGN_LENGTH, MAX_STARS } from '@/data';
import { narrativeFor, stories } from '@/data/campaign/narrative';
import type { ShiftNarrative } from '@/data/campaign/narrative';
import { robotForLevel } from '@/domain/robots';
import { completeLevel, newSave, readSave, writeSave } from '@/features/campaign/save/persistence';
import type { ProgressSave, RobotPrograms, RobotRole, Settings } from '@/domain';
import { configureAudio, playSound, startAudio } from '@/audio';
import { go } from '@/app/navigation';
import { useHashRoute } from '@/app/useHashRoute';

export type Update = Dispatch<SetStateAction<ProgressSave>>;

interface GameStore {
  save: ProgressSave;
  saveError: string;
  recovery: boolean;
  route: string;
  go: (path: string) => void;
  update: Update;
  launch: (index: number) => void;
  select: (index: number) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  completeShift: (index: number, starsCount: number, querySource: string, programs: RobotPrograms) => void;
  resetCafe: () => void;
  importCafe: (next: ProgressSave) => void;
}

const GameContext = createContext<GameStore | null>(null);

/** Owns persisted game state, the route, and campaign actions; view-local UI state stays in components. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      return readSave(localStorage, lessons);
    } catch {
      return { save: newSave(), error: 'Local storage is unavailable. Export your café to preserve progress.' };
    }
  });
  const [save, setSave] = useState(initial.save),
    [saveError, setSaveError] = useState(initial.error),
    [recovery, setRecovery] = useState(!!initial.error);
  const [route] = useHashRoute();
  useEffect(() => {
    if (!recovery) setSaveError(writeSave(localStorage, save));
    configureAudio(save.settings);
    document.documentElement.dataset.motion = save.settings.reduced_motion ? 'reduced' : 'full';
  }, [save, recovery]);
  useEffect(() => {
    const gesture = (e: Event) => {
      startAudio();
      if (e.target instanceof Element && e.target.closest('button')) playSound('click');
    };
    window.addEventListener('pointerdown', gesture);
    window.addEventListener('keydown', gesture);
    return () => {
      window.removeEventListener('pointerdown', gesture);
      window.removeEventListener('keydown', gesture);
    };
  }, []);
  const store = useMemo<GameStore>(
    () => ({
      save,
      saveError,
      recovery,
      route,
      go,
      update: setSave,
      launch: (index: number) => {
        if (index > save.unlocked) return;
        setSave((s) => ({ ...s, selected: index }));
        go(stories[index] && !save.story[index] ? `/interlude/${index + 1}` : `/shift/${index + 1}`);
      },
      select: (index: number) => setSave((s) => ({ ...s, selected: index })),
      updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) =>
        setSave((s) => ({ ...s, settings: { ...s.settings, [key]: value } })),
      completeShift: (index, starsCount, querySource, programs) => {
        setSave((s) => ({
          ...completeLevel(s, index, starsCount, querySource, lessons),
          robotSolutions: { ...s.robotSolutions, [index]: programs },
        }));
      },
      resetCafe: () => {
        setSave((s) => newSave(s.settings));
        setRecovery(false);
        go('/');
      },
      importCafe: (next: ProgressSave) => {
        setSave(next);
        setRecovery(false);
        setSaveError('');
      },
    }),
    [save, saveError, recovery, route],
  );
  return <GameContext.Provider value={store}>{children}</GameContext.Provider>;
}

export function useGame(): GameStore {
  const store = useContext(GameContext);
  if (!store) throw new Error('useGame must be used inside <GameProvider>.');
  return store;
}

/** Everything a shift screen needs: level, lesson, brief, interlude, and title. */
export function useShift(index: number): {
  level: (typeof levels)[number];
  lesson: (typeof lessons)[number];
  brief: ShiftNarrative;
  story?: { title: string; text: string };
  title: string;
} {
  return {
    level: levels[index],
    lesson: lessons[index],
    brief: narrativeFor(index),
    story: stories[index],
    title: titleFor(index),
  };
}

/** Campaign progress: completed shifts, star totals, and maxima. */
export function useProgress(): { done: number; total: number; stars: number; max: number } {
  const { save } = useGame();
  return {
    done: Object.keys(save.stars).length,
    total: CAMPAIGN_LENGTH,
    stars: Object.values(save.stars).reduce((a, b) => a + b, 0),
    max: MAX_STARS,
  };
}

/** Audio/display settings plus a single-key updater. */
export function useSettings(): [Settings, <K extends keyof Settings>(key: K, value: Settings[K]) => void] {
  const { save, updateSetting } = useGame();
  return [save.settings, updateSetting];
}

/** Default programmable role for a zero-based shift index. */
export function useDefaultRole(index: number): RobotRole {
  return robotForLevel(index + 1);
}
