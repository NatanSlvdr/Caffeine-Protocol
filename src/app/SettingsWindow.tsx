import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FolderHeart,
  Languages,
  Maximize,
  Minimize,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  Volume2,
} from 'lucide-react';
import { lessons } from '@/data';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { SettingRow } from '@/shared/ui/SettingRow';
import { LANGUAGES, useLanguage, useWords, type Language } from '@/shared/language';
import {
  MAX_CAFES,
  cafeKey,
  freeCafeName,
  migrationChanges,
  parseSave,
  untouched,
  SAVE_REFUSALS,
} from '@/features/campaign/save/persistence';
import type { DialoguePace, ProgressSave } from '@/domain';
import { download, saveFileName } from '@/shared/lib/download';
import { isNotebookFile } from '@/features/workspace/notebook';
import { useCafeName, useGame, useSettings } from '@/state/GameStore';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { updateNow, useUpdateReady } from './offlineUpdate';
import { CAFE_WORDS } from './cafeWords';
import { CafesSection } from './CafesSection';
import { SETTINGS_WORDS } from './settingsWords';
import { SAVE_NOTICE_WORDS } from './saveNoticeWords';

const PACES: DialoguePace[] = ['typed', 'quick', 'whole'];

/** Café settings, printed on a slip of order paper that opens over whichever screen you're on. */
export function SettingsWindow({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const { save, recovery, saveError, elsewhere, importCafe, backup, restoreBackup, cafes, cafeId, addCafe } = useGame();
  const cafe = useCafeName();
  const say = useWords(SETTINGS_WORDS);
  const problems = useWords(SAVE_NOTICE_WORDS).problems;
  const cafeWords = useWords(CAFE_WORDS);
  const [language, setLanguage] = useLanguage();
  // What a café holds, or that it's a fresh one.
  const holds = (kept: ProgressSave) => cafeWords.holds(kept) || cafeWords.fresh;
  const updateReady = useUpdateReady();
  // A café waiting on the Replace slip: one chosen from a file, with what bringing it up to date changes, or the kept copy.
  const [pending, setPending] = useState<{ save: ProgressSave; changes?: string[]; kept?: true } | null>(null),
    [error, setError] = useState(''),
    [status, setStatus] = useAnnouncement();
  const input = useRef<HTMLInputElement>(null);
  const [settings, setting] = useSettings();
  // With more than one café, a slip that replaces one says which.
  const openName = cafes.cafes.length > 1 ? cafes.cafes.find((c) => c.id === cafeId)?.name : undefined;
  const full = cafes.cafes.length >= MAX_CAFES;
  // Track the browser's own state, so leaving with Esc relabels the button too.
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  // Some tablet browsers, and a café saved to the home screen, can't go fullscreen; offer it only where it works.
  const canFullscreen = !!document.fullscreenEnabled;
  const [fullscreenError, setFullscreenError] = useState('');
  const systemReducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  // Each attempt clears the last one's error, so a retry that works doesn't leave it showing.
  const fullscreen = async () => {
    const leaving = !!document.fullscreenElement;
    setFullscreenError('');
    try {
      if (leaving) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError(say.fullscreenFailed(leaving));
    }
  };
  return (
    <>
      <Modal className="settings-window" kicker={say.kicker(cafe)} title={say.title} onClose={onClose} wide>
        <div className="settings-sheet">
          {/* Sound and the language share a column, as short as the display settings beside them are long. */}
          <div className="settings-column">
            <section className="settings-block">
              <h3>
                <Volume2 size={16} aria-hidden="true" /> {say.sound}
              </h3>
              <label className="settings-volume">
                <span>
                  {say.music}
                  <strong>{Math.round(settings.music * 100)}%</strong>
                </span>
                <input
                  aria-label={say.musicVolume}
                  aria-valuetext={`${Math.round(settings.music * 100)}%`}
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={settings.music}
                  onChange={(e) => setting('music', Number(e.target.value))}
                />
              </label>
            </section>
            <section className="settings-block">
              <h3 id="language-title">
                <Languages size={16} aria-hidden="true" /> {say.language}
              </h3>
              <div
                className="settings-pace settings-language"
                role="radiogroup"
                aria-labelledby="language-title"
                aria-describedby="language-hint"
              >
                {LANGUAGES.map(({ id, name }) => (
                  // Each language is named in itself, and read aloud as such.
                  <label key={id} lang={id}>
                    <input type="radio" name="language" checked={language === id} onChange={() => setLanguage(id)} />
                    {name}
                  </label>
                ))}
              </div>
              <p id="language-hint">{say.languageHint}</p>
            </section>
          </div>
          <section className="settings-block">
            <h3>
              <Sparkles size={16} aria-hidden="true" /> {say.display}
            </h3>
            {/* The device's own setting already calms the café, so the box shows it on rather than doing nothing. */}
            <SettingRow
              title={say.reducedMotion}
              hint={systemReducedMotion ? say.reducedBySystem : say.reducedHint}
              checked={settings.reduced_motion || systemReducedMotion}
              disabled={systemReducedMotion}
              onChange={(e) => setting('reduced_motion', e.target.checked)}
            />
            <div className="setting-row" role="radiogroup" aria-labelledby="dialogue-pace-title">
              <span>
                <strong id="dialogue-pace-title">{say.pace}</strong>
                <small>{settings.reduced_motion || systemReducedMotion ? say.paceWhole : say.paceHint}</small>
              </span>
              <span className="settings-pace">
                {PACES.map((pace) => (
                  <label key={pace}>
                    <input
                      type="radio"
                      name="dialogue-pace"
                      checked={settings.dialogue_pace === pace}
                      onChange={() => setting('dialogue_pace', pace)}
                    />
                    {say.paces[pace]}
                  </label>
                ))}
              </span>
            </div>
            <SettingRow
              title={say.pixelArt}
              hint={say.pixelArtHint}
              checked={settings.pixel_art}
              onChange={(e) => setting('pixel_art', e.target.checked)}
            />
            <SettingRow
              title={say.shortRepeats}
              hint={say.shortRepeatsHint}
              checked={settings.short_repeats}
              onChange={(e) => setting('short_repeats', e.target.checked)}
            />
            {canFullscreen && (
              <div className="setting-row">
                <span>
                  <strong>{say.fullscreen}</strong>
                  <small>{say.fullscreenHint}</small>
                </span>
                <button className="settings-chip" onClick={() => void fullscreen()}>
                  {isFullscreen ? (
                    <>
                      <Minimize size={15} aria-hidden="true" /> {say.exitFullscreen}
                    </>
                  ) : (
                    <>
                      <Maximize size={15} aria-hidden="true" /> {say.goFullscreen}
                    </>
                  )}
                </button>
              </div>
            )}
            {fullscreenError && (
              <p role="alert" className="error-text">
                {fullscreenError}
              </p>
            )}
          </section>
          <section className="settings-block">
            <h3>
              <FolderHeart size={16} aria-hidden="true" /> {say.saved}
            </h3>
            <p>{say.savedIntro}</p>
            <div className="settings-actions">
              <button
                className="settings-chip"
                onClick={() => {
                  const name = saveFileName();
                  download(JSON.stringify(save, null, 2), name);
                  // Some browsers save without a word, so the slip says where the copy went.
                  setError('');
                  setStatus(cafeWords.exported(name));
                }}
              >
                <Download size={15} aria-hidden="true" /> {cafeWords.exportCafe}
              </button>
              <button className="settings-chip" onClick={() => input.current?.click()}>
                <Upload size={15} aria-hidden="true" /> {say.importCafe}
              </button>
              {recovery && (
                <button
                  className="settings-chip"
                  onClick={() => {
                    setStatus('');
                    try {
                      const name = saveFileName(new Date(), 'recovery');
                      download(localStorage.getItem(cafeKey()) ?? '', name);
                      setError('');
                      setStatus(say.recoveryExported(name));
                    } catch {
                      setError(say.noStorage);
                    }
                  }}
                >
                  {say.recovery}
                </button>
              )}
            </div>
            <input
              ref={input}
              aria-label={say.importFile}
              className="file-input"
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setStatus('');
                if (file) {
                  try {
                    if (file.size > 2_000_000) throw new Error(SAVE_REFUSALS.large);
                    const text = await file.text();
                    if (isNotebookFile(text)) throw new Error(say.notebookFile);
                    setPending({ save: parseSave(text, lessons), changes: migrationChanges(text, lessons) });
                    setError('');
                  } catch (err) {
                    setError(importProblem(file.name, err, say));
                  }
                }
                e.target.value = '';
              }}
            />
            {backup && (
              <div className="settings-backup">
                <div>
                  <p>{say.keptCopy(say.before[backup.reason], when(backup.saved_at, language), holds(backup.save))}</p>
                  <Changes changes={backup.changes} lead={say.updateChanged} />
                </div>
                <button className="settings-chip" onClick={() => setPending({ save: backup.save, kept: true })}>
                  <RotateCcw size={15} aria-hidden="true" /> {say.restoreKept}
                </button>
              </div>
            )}
            {/* Present before any export or import, so the confirmation is announced when it lands. */}
            <p className="settings-status" role="status">
              {status}
            </p>
            {(error || saveError) && (
              <p role="alert" className="error-text">
                {error || (saveError && problems[saveError])}
              </p>
            )}
          </section>
          <CafesSection onStartOver={onNew} />
        </div>
        {updateReady && (
          <div className="settings-update">
            <p>{say.update(!!saveError || elsewhere)}</p>
            {!saveError && !elsewhere && (
              <button className="settings-chip" onClick={updateNow}>
                <RefreshCw size={15} aria-hidden="true" /> {say.updateNow}
              </button>
            )}
          </div>
        )}
        <p className="settings-foot" aria-hidden="true">
          <span className="settings-barcode" />
          {say.savingFoot(!saveError && !elsewhere)}
        </p>
      </Modal>
      {pending && (
        <Modal
          className="settings-window confirm-slip"
          kicker={say.replaceKicker(!!pending.kept)}
          title={say.replaceTitle}
          onClose={() => setPending(null)}
        >
          <p>
            {say.replaceBody({
              kept: !!pending.kept,
              holdsOrFresh: cafeWords.holdsOrFresh(cafeWords.holds(pending.save)),
              open: openName,
              untouched: untouched(save),
              full,
            })}
          </p>
          <Changes changes={pending.changes} lead={say.olderVersion} />
          <div className="modal-buttons">
            <button className="settings-chip" data-autofocus onClick={() => setPending(null)}>
              {say.keepCurrent}
            </button>
            {!pending.kept && !full && (
              <button
                className="settings-chip"
                onClick={() => {
                  const name = addCafe(freeCafeName(cafes, say.importedName), { save: pending.save, open: false });
                  setPending(null);
                  if (!name) return setError(cafeWords.noRoom);
                  setStatus(say.added(name, holds(pending.save)));
                }}
              >
                {say.addAsNew}
              </button>
            )}
            <Button
              variant="danger"
              onClick={() => {
                if (pending.kept) restoreBackup();
                else importCafe(pending.save);
                setPending(null);
                setStatus(say.replaced(!!pending.kept, holds(pending.save)));
              }}
            >
              {pending.kept ? say.restoreCopy : say.replaceCafe}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** What bringing an older café up to date changed in it, or nothing when it was already current. */
function Changes({ changes = [], lead }: { changes?: string[]; lead: string }) {
  if (!changes.length) return null;
  return (
    <div className="settings-changes">
      <p>{lead}</p>
      <ul>
        {changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * When the kept copy was taken, in the player's own date and time format: the browser's, or, reading in a language
 * the browser isn't set to, that language's.
 */
const when = (iso: string, language: Language) =>
  new Date(iso).toLocaleString(navigator.language.startsWith(language) ? undefined : language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** Why a chosen file was not imported, said in full, and that nothing was replaced. */
function importProblem(name: string, err: unknown, say: (typeof SETTINGS_WORDS)['en']): string {
  // Only the save checks' own errors are worded for players; anything else is just unreadable.
  const message = err instanceof Error && err.constructor === Error ? err.message : '';
  const refusal = (Object.keys(SAVE_REFUSALS) as (keyof typeof SAVE_REFUSALS)[]).find(
    (key) => SAVE_REFUSALS[key] === message,
  );
  const why =
    err instanceof SyntaxError
      ? say.refusals.foreign
      : refusal
        ? say.refusals[refusal]
        : // The save checks name the exact field that failed; say that much, as damage.
          /^(Invalid|Missing) /.test(message)
          ? say.damaged(message)
          : message || say.unreadable;
  return say.notImported(name, why);
}
