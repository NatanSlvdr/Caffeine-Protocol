import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { isRated, lessons, levels, CAMPAIGN_LENGTH, MAX_STARS } from '@/data';
import { campaignNarrative, narrativeFor, type ShiftNarrative } from '@/data/campaign/narrative';
import { campaignNarrativeFr } from '@/data/campaign/narrative.fr';
import { shiftIntro, shiftOutro } from '@/data/campaign/dialogue';
import { waitingScene, type Cutscene } from '@/data/campaign/cutscenes';
import {
  CAFES_KEY,
  MAX_CAFES,
  addCafe as listCafe,
  answerChoice,
  backupSave,
  cafeKey,
  clearCafe,
  completeDrill,
  completeLevel,
  completeRepair,
  migrationChanges,
  type MigrationChange,
  pickDecor,
  newSave,
  parseSave,
  readBackup,
  openCafeId,
  readCafes,
  readSave,
  removeCafe as unlistCafe,
  renameCafe as relabelCafe,
  settleCafe,
  storedIsOlder,
  writeCafes,
  writeSave,
  type BackupReason,
  type CafeList,
  type SaveBackup,
  type SaveProblem,
} from '@/features/campaign/save/persistence';
import type { ChallengeMeasure, Decor, DecorSpot, DialogueLine, ProgressSave, RobotPrograms, Settings } from '@/domain';
import { configureAudio, startAudio } from '@/audio';
import { go, reloadPage } from '@/shared/lib/navigation';
import { useLanguage, words, useWords } from '@/shared/language';
import { useHashRoute } from '@/app/useHashRoute';

export type Update = Dispatch<SetStateAction<ProgressSave>>;

interface GameStore {
  save: ProgressSave;
  /** Why the café isn't being saved, or nothing while it is. */
  saveError: SaveProblem | '';
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
  updated: MigrationChange[];
  dismissUpdated: () => void;
  route: string;
  go: (path: string) => void;
  update: Update;
  launch: (index: number) => void;
  select: (index: number) => void;
  /** Marks a scene seen (or skipped) and selects the shift it opens. */
  finishScene: (scene: Cutscene) => void;
  /** What Niko said at a choice in the story; the latest answer is the one later scenes recall. */
  choose: (choice: string, option: string) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** A served shift, with the routines it was served with and the optional challenges the service met. */
  completeShift: (
    index: number,
    starsCount: number,
    querySource: string,
    programs: RobotPrograms,
    met: ChallengeMeasure[],
  ) => void;
  /** A drill got right on the first pick: kept apart from the stars, as done. */
  completeDrill: (id: string) => void;
  /** A robot mended on the repair bench: kept, and nothing scored. */
  completeRepair: (id: string) => void;
  /** A look picked for a spot in the café; only looks, nothing scored. */
  pickDecor: <Spot extends DecorSpot>(spot: Spot, id: Decor[Spot]) => void;
  resetCafe: () => void;
  importCafe: (next: ProgressSave) => void;
  /** The cafés kept in this browser, and the one this tab plays. */
  cafes: CafeList;
  cafeId: string;
  /** Plays another café: the page reloads into it. */
  openCafe: (id: string) => void;
  /**
   * Adds a café, fresh with these settings or the one given, and opens it unless told not to. Returns its name, or
   * nothing when the browser wouldn't keep it.
   */
  addCafe: (name: string, options?: { save?: ProgressSave; open?: boolean }) => string | undefined;
  renameCafe: (id: string, name: string) => boolean;
  /** Removes a café other than this tab's, and everything it kept. */
  removeCafe: (id: string) => boolean;
}

const GameContext = createContext<GameStore | null>(null);

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
    // Which café this tab plays is settled first, and every read and save after this goes to its keys.
    const cafes = settleCafe(storage);
    if (!storage)
      return { save: newSave(), error: 'blocked' as const, recovery: false, backup: null, updated: [], cafes };
    // A café from an older version is kept as it was before the first save rewrites it in the new one. That save
    // makes it current, so the player hears what changed on this visit only.
    const older = storedIsOlder(storage);
    if (older) backupSave(storage, 'migration', lessons);
    const updated = older ? migrationChanges(storage.getItem(cafeKey()) ?? '', lessons) : [];
    const read = readSave(storage, lessons);
    // Only an unreadable café is held back from saves, so a recovery copy of it can still be exported.
    return { ...read, recovery: !!read.error, backup: readBackup(storage, lessons), updated, cafes };
  });
  const [save, setSave] = useState(initial.save),
    [saveError, setSaveError] = useState(initial.error),
    [recovery, setRecovery] = useState(initial.recovery),
    [backup, setBackup] = useState(initial.backup),
    [updated, setUpdated] = useState(initial.updated),
    [cafes, setCafes] = useState(initial.cafes);
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
      // A café added, renamed or removed in another tab shows here too.
      if (event.key === CAFES_KEY) {
        const storage = siteStorage();
        if (!storage) return;
        const list = readCafes(storage);
        // Removed from another tab, this café has nowhere left to save: open the one that tab left open instead.
        if (!list.cafes.some((cafe) => cafe.id === openCafeId())) return reloadPage();
        setCafes(list);
        return;
      }
      if (event.key !== cafeKey() || event.newValue === null) return;
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
      const error = storage ? writeSave(storage, save) : 'blocked';
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
      choose: (choice, option) => setSave((s) => answerChoice(s, choice, option)),
      updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) =>
        setSave((s) => ({ ...s, settings: { ...s.settings, [key]: value } })),
      completeShift: (index, starsCount, querySource, programs, met) => {
        setSave((s) => ({
          ...completeLevel(s, index, starsCount, querySource, lessons, met),
          robotSolutions: { ...s.robotSolutions, [index]: programs },
        }));
      },
      completeDrill: (id) => setSave((s) => completeDrill(s, id)),
      completeRepair: (id) => setSave((s) => completeRepair(s, id)),
      pickDecor: (spot, id) => setSave((s) => pickDecor(s, spot, id)),
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
      cafes,
      cafeId: openCafeId(),
      openCafe: (id) => {
        const storage = siteStorage();
        if (!storage || !cafes.cafes.some((cafe) => cafe.id === id)) return;
        writeCafes(storage, { ...readCafes(storage), open: id });
        go('/');
        reloadPage();
      },
      addCafe: (name, { save: start, open = true } = {}) => {
        const storage = siteStorage();
        const list = storage && readCafes(storage);
        if (!storage || !list || list.cafes.length >= MAX_CAFES) return undefined;
        const { list: next, id } = listCafe(list, name);
        clearCafe(storage, id);
        try {
          storage.setItem(cafeKey(id), JSON.stringify(start ?? newSave(save.settings)));
        } catch {
          return undefined;
        }
        if (!writeCafes(storage, next)) {
          clearCafe(storage, id);
          return undefined;
        }
        setCafes(next);
        if (open) {
          writeCafes(storage, { ...next, open: id });
          go('/');
          reloadPage();
        }
        return next.cafes.find((cafe) => cafe.id === id)!.name;
      },
      renameCafe: (id, name) => {
        const storage = siteStorage();
        if (!storage) return false;
        const next = relabelCafe(readCafes(storage), id, name);
        if (!writeCafes(storage, next)) return false;
        setCafes(next);
        return true;
      },
      removeCafe: (id) => {
        const storage = siteStorage();
        if (!storage || id === openCafeId()) return false;
        const next = unlistCafe(storage, readCafes(storage), id);
        if (!writeCafes(storage, next)) return false;
        setCafes(next);
        return true;
      },
    }),
    [save, saveError, recovery, elsewhere, backup, updated, route, cafes],
  );
  return <GameContext.Provider value={store}>{children}</GameContext.Provider>;
}

export function useGame(): GameStore {
  const store = useContext(GameContext);
  if (!store) throw new Error('useGame must be used inside <GameProvider>.');
  return store;
}

const NARRATIVE = words(
  campaignNarrative,
  campaignNarrative.map((row, index) => ({ ...row, ...campaignNarrativeFr[index] })),
);

/** Every shift's opening and closing scenes, set with French typography in French. */
const SCENES = words(
  { intro: levels.map((_, i) => shiftIntro(i)), outro: levels.map((_, i) => shiftOutro(i)) },
  { intro: levels.map((_, i) => shiftIntro(i, 'fr')), outro: levels.map((_, i) => shiftOutro(i, 'fr')) },
);

/** Every shift's title and brief, in the reader's language. */
export const useNarrative = (): readonly ShiftNarrative[] => useWords(NARRATIVE);

/**
 * Everything a shift screen needs: level, lesson, brief, intro and payoff scenes, and title, all in the reader's
 * language.
 */
export function useShift(index: number): {
  level: (typeof levels)[number];
  lesson: (typeof lessons)[number];
  brief: ShiftNarrative;
  intro: DialogueLine[];
  outro: DialogueLine[];
  title: string;
} {
  const [language] = useLanguage();
  const brief = NARRATIVE[language][index] ?? narrativeFor(index);
  const lesson = useMemo(
    () => (language === 'en' ? lessons[index] : { ...lessons[index], note: brief.lessonNote }),
    [language, index, brief],
  );
  return {
    level: levels[index],
    lesson,
    brief,
    intro: SCENES[language].intro[index] ?? shiftIntro(index),
    outro: SCENES[language].outro[index] ?? shiftOutro(index),
    title: brief.title,
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
