import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { lessons, levels, titleFor, CAMPAIGN_LENGTH, MAX_STARS } from '@/data';
import { narrativeFor } from '@/data/campaign/narrative';
import type { ShiftNarrative } from '@/data/campaign/narrative';
import { shiftIntro, shiftOutro } from '@/data/campaign/dialogue';
import { waitingScene, type Cutscene } from '@/data/campaign/cutscenes';
import { completeLevel, newSave, readSave, writeSave } from '@/features/campaign/save/persistence';
import type { DialogueLine, ProgressSave, RobotPrograms, Settings } from '@/domain';
import { configureAudio, playSound, startAudio } from '@/audio';
import { go } from '@/shared/lib/navigation';
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
  /** Marks a scene seen (or skipped) and selects the shift it opens. */
  finishScene: (scene: Cutscene) => void;
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
    if (!recovery) {
      // Only a change of error re-renders: every keystroke saves, and a no-op update per save piles up during fast typing.
      const error = writeSave(localStorage, save);
      if (error !== saveError) setSaveError(error);
    }
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
        if (index > save.unlocked || waitingScene(save, index)) return;
        setSave((s) => ({ ...s, selected: index }));
        go(`/shift/${index + 1}`);
      },
      select: (index: number) => setSave((s) => ({ ...s, selected: index })),
      finishScene: (scene: Cutscene) =>
        setSave((s) =>
          scene.before < levels.length
            ? { ...s, selected: scene.before, story: { ...s.story, [scene.before]: true } }
            : s,
        ),
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

/** Everything a shift screen needs: level, lesson, brief, intro and payoff scenes, and title. */
export function useShift(index: number): {
  level: (typeof levels)[number];
  lesson: (typeof lessons)[number];
  brief: ShiftNarrative;
  intro: DialogueLine[];
  outro: DialogueLine[];
  title: string;
} {
  return {
    level: levels[index],
    lesson: lessons[index],
    brief: narrativeFor(index),
    intro: shiftIntro(index),
    outro: shiftOutro(index),
    title: titleFor(index),
  };
}

/** Stars across rated shifts only, matching MAX_STARS, so an edited save can't total past the maximum. */
export function starTotal(stars: ProgressSave['stars']): number {
  return Object.entries(stars).reduce((a, [i, b]) => a + (levels[Number(i)]?.programming_enabled ? b : 0), 0);
}

/** Campaign progress: completed shifts, star totals, and maxima. */
export function useProgress(): { done: number; total: number; stars: number; max: number } {
  const { save } = useGame();
  return {
    done: Object.keys(save.stars).length,
    total: CAMPAIGN_LENGTH,
    stars: starTotal(save.stars),
    max: MAX_STARS,
  };
}

/**
 * The name over the door. The story asks whose café it is: it stays Lou’s until the closing scene,
 * where Moka says “It’s your café”, and only a finished campaign hangs up Niko’s name.
 */
export function useCafeName(): string {
  return useGame().save.complete ? 'Café Niko' : 'Lou’s';
}

/** Audio/display settings plus a single-key updater. */
export function useSettings(): [Settings, <K extends keyof Settings>(key: K, value: Settings[K]) => void] {
  const { save, updateSetting } = useGame();
  return [save.settings, updateSetting];
}
