import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { isRated, lessons, levels, titleFor, CAMPAIGN_LENGTH, MAX_STARS } from '@/data';
import { narrativeFor } from '@/data/campaign/narrative';
import type { ShiftNarrative } from '@/data/campaign/narrative';
import { shiftIntro, shiftOutro } from '@/data/campaign/dialogue';
import { waitingScene, type Cutscene } from '@/data/campaign/cutscenes';
import {
  SAVE_KEY,
  backupSave,
  completeLevel,
  migrationChanges,
  newSave,
  parseSave,
  readBackup,
  readSave,
  storedIsOlder,
  writeSave,
  type BackupReason,
  type SaveBackup,
} from '@/features/campaign/save/persistence';
import type { DialogueLine, ProgressSave, RobotPrograms, Settings } from '@/domain';
import { configureAudio, startAudio } from '@/audio';
import { go, reloadPage } from '@/shared/lib/navigation';
import { useHashRoute } from '@/app/useHashRoute';

export type Update = Dispatch<SetStateAction<ProgressSave>>;

interface GameStore {
  save: ProgressSave;
  saveError: string;
  recovery: boolean;
  /** Another tab or window saved this café since this one last did, so this one has stopped saving. */
  elsewhere: boolean;
  /** Reload this tab from the progress the other one saved. */
  loadElsewhere: () => void;
  /** Save this tab's progress over the other one's, and carry on saving. */
  keepThisTab: () => void;
  /** The café as it was before it was last imported over, reset, restored, or updated to a new save version. */
  backup: SaveBackup | null;
  /** Put the kept copy back, keeping the café it replaces in its place. */
  restoreBackup: () => void;
  /** What updating the stored café to this version just changed, until the player has read it; see migrationChanges. */
  updated: string[];
  dismissUpdated: () => void;
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

const STORAGE_BLOCKED =
  'This browser isn’t letting the café save here, so progress made now won’t be kept. Export your café from Settings to keep it.';

/** With site data blocked, even reading `localStorage` throws, so every use goes through here. */
function siteStorage(): Storage | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

/** Owns persisted game state, the route, and campaign actions; view-local UI state stays in components. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const storage = siteStorage();
    if (!storage) return { save: newSave(), error: STORAGE_BLOCKED, recovery: false, backup: null, updated: [] };
    // A café from an older version is kept as it was before the first save rewrites it in the new one. That save
    // makes it current, so the player hears what changed on this visit only.
    const older = storedIsOlder(storage);
    if (older) backupSave(storage, 'migration', lessons);
    const updated = older ? migrationChanges(storage.getItem(SAVE_KEY) ?? '', lessons) : [];
    const read = readSave(storage, lessons);
    // Only an unreadable café is held back from saves, so a recovery copy of it can still be exported.
    return { ...read, recovery: !!read.error, backup: readBackup(storage, lessons), updated };
  });
  const [save, setSave] = useState(initial.save),
    [saveError, setSaveError] = useState(initial.error),
    [recovery, setRecovery] = useState(initial.recovery),
    [backup, setBackup] = useState(initial.backup),
    [updated, setUpdated] = useState(initial.updated);
  // Runs before the replacement is saved, so the slot gets the café still in storage: the one being replaced.
  const keep = (reason: BackupReason) => {
    const storage = siteStorage();
    if (storage && backupSave(storage, reason, lessons)) setBackup(readBackup(storage, lessons));
  };
  const [route] = useHashRoute();
  // Two tabs saving one café would each quietly overwrite the other, so once another tab saves, this one holds off
  // until the player says whose progress to keep.
  const [elsewhere, setElsewhere] = useState(false);
  const latest = useRef(save);
  useEffect(() => {
    const saved = (event: StorageEvent) => {
      if (event.key !== SAVE_KEY || event.newValue === null) return;
      // Opening the café in another tab writes the same progress back; only a real change counts.
      const read = (raw: string) => JSON.stringify(parseSave(raw, lessons));
      let same = false;
      try {
        same = read(event.newValue) === read(JSON.stringify(latest.current));
      } catch {
        // Unreadable data written over this café is a change too.
      }
      if (!same) setElsewhere(true);
    };
    window.addEventListener('storage', saved);
    return () => window.removeEventListener('storage', saved);
  }, []);
  useEffect(() => {
    latest.current = save;
    if (!recovery && !elsewhere) {
      // Only a change of error re-renders: every keystroke saves, and a no-op update per save piles up during fast typing.
      const storage = siteStorage();
      const error = storage ? writeSave(storage, save) : STORAGE_BLOCKED;
      if (error !== saveError) setSaveError(error);
    }
    configureAudio(save.settings);
    document.documentElement.dataset.motion = save.settings.reduced_motion ? 'reduced' : 'full';
  }, [save, recovery, elsewhere]);
  useEffect(() => {
    const gesture = () => startAudio();
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
      elsewhere,
      loadElsewhere: reloadPage,
      keepThisTab: () => setElsewhere(false),
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
        keep('reset');
        setUpdated([]);
        setSave((s) => newSave(s.settings));
        setRecovery(false);
        go('/');
      },
      importCafe: (next: ProgressSave) => {
        keep('import');
        setUpdated([]);
        setSave(next);
        setRecovery(false);
        setSaveError('');
      },
      backup,
      restoreBackup: () => {
        if (!backup) return;
        keep('restore');
        setUpdated([]);
        setSave(backup.save);
        setRecovery(false);
        setSaveError('');
      },
      updated,
      dismissUpdated: () => setUpdated([]),
    }),
    [save, saveError, recovery, elsewhere, backup, updated, route],
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
  return Object.entries(stars).reduce((a, [i, b]) => a + (isRated(Number(i)) ? b : 0), 0);
}

/** Campaign progress: served shifts, star totals, and maxima. */
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
