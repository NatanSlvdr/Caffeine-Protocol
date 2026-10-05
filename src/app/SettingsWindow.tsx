import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FolderHeart,
  Leaf,
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
import { SettingRow, SHORT_REPEATS_HINT } from '@/shared/ui/SettingRow';
import {
  SAVE_KEY,
  migrationChanges,
  parseSave,
  untouched,
  type BackupReason,
} from '@/features/campaign/save/persistence';
import { count, type DialoguePace, type ProgressSave } from '@/domain';
import { download, saveFileName } from '@/shared/lib/download';
import { isNotebookFile } from '@/features/workspace/notebook';
import { starTotal, useCafeName, useGame, useSettings } from '@/state/GameStore';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { updateNow, useUpdateReady } from './offlineUpdate';

const PACES: [DialoguePace, string][] = [
  ['typed', 'Typed'],
  ['quick', 'Quick'],
  ['whole', 'Whole lines'],
];

/** Café settings, printed on a slip of order paper that opens over whichever screen you're on. */
export function SettingsWindow({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const { save, recovery, saveError, elsewhere, importCafe, backup, restoreBackup } = useGame();
  const cafe = useCafeName();
  const updateReady = useUpdateReady();
  // A café waiting on the Replace slip: one chosen from a file, with what bringing it up to date changes, or the kept copy.
  const [pending, setPending] = useState<{ save: ProgressSave; changes?: string[]; kept?: true } | null>(null),
    [error, setError] = useState(''),
    [status, setStatus] = useAnnouncement();
  const input = useRef<HTMLInputElement>(null);
  const [settings, setting] = useSettings();
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
      setFullscreenError(
        `This browser window didn’t ${leaving ? 'leave' : 'go'} fullscreen. Try again, or use the browser’s own menu.`,
      );
    }
  };
  return (
    <>
      <Modal
        className="settings-window"
        kicker={`${cafe} · House settings`}
        title="The little things."
        onClose={onClose}
        wide
      >
        <div className="settings-sheet">
          <section className="settings-block">
            <h3>
              <Volume2 size={16} aria-hidden="true" /> Sound
            </h3>
            <label className="settings-volume">
              <span>
                Music
                <strong>{Math.round(settings.music * 100)}%</strong>
              </span>
              <input
                aria-label="Music volume"
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
            <h3>
              <Sparkles size={16} aria-hidden="true" /> Display & motion
            </h3>
            {/* The device's own setting already calms the café, so the box shows it on rather than doing nothing. */}
            <SettingRow
              title="Reduced motion"
              hint={
                systemReducedMotion
                  ? 'On, because your device asks for less motion.'
                  : 'Keep the movement, skip the extra animation.'
              }
              checked={settings.reduced_motion || systemReducedMotion}
              disabled={systemReducedMotion}
              onChange={(e) => setting('reduced_motion', e.target.checked)}
            />
            <div className="setting-row" role="radiogroup" aria-labelledby="dialogue-pace-title">
              <span>
                <strong id="dialogue-pace-title">Dialogue text</strong>
                <small>
                  {settings.reduced_motion || systemReducedMotion
                    ? 'Lines show whole while reduced motion is on.'
                    : 'How the crew’s lines appear.'}
                </small>
              </span>
              <span className="settings-pace">
                {PACES.map(([pace, label]) => (
                  <label key={pace}>
                    <input
                      type="radio"
                      name="dialogue-pace"
                      checked={settings.dialogue_pace === pace}
                      onChange={() => setting('dialogue_pace', pace)}
                    />
                    {label}
                  </label>
                ))}
              </span>
            </div>
            <SettingRow
              title="Pixel-art shader"
              hint="Crisp pixels and outlined edges."
              checked={settings.pixel_art}
              onChange={(e) => setting('pixel_art', e.target.checked)}
            />
            <SettingRow
              title="Shorter repeats"
              hint={SHORT_REPEATS_HINT}
              checked={settings.short_repeats}
              onChange={(e) => setting('short_repeats', e.target.checked)}
            />
            {canFullscreen && (
              <div className="setting-row">
                <span>
                  <strong>Fullscreen</strong>
                  <small>A little more room for your café.</small>
                </span>
                <button className="settings-chip" onClick={() => void fullscreen()}>
                  {isFullscreen ? (
                    <>
                      <Minimize size={15} aria-hidden="true" /> Exit fullscreen
                    </>
                  ) : (
                    <>
                      <Maximize size={15} aria-hidden="true" /> Go fullscreen
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
              <FolderHeart size={16} aria-hidden="true" /> Your café, saved
            </h3>
            <p>Progress stays in this browser. Export a copy to keep it safe or carry it to another computer.</p>
            <div className="settings-actions">
              <button
                className="settings-chip"
                onClick={() => {
                  const name = saveFileName();
                  download(JSON.stringify(save, null, 2), name);
                  // Some browsers save without a word, so the slip says where the copy went.
                  setError('');
                  setStatus(`Café exported as ${name}. Look for it with your downloads.`);
                }}
              >
                <Download size={15} aria-hidden="true" /> Export café
              </button>
              <button className="settings-chip" onClick={() => input.current?.click()}>
                <Upload size={15} aria-hidden="true" /> Import café
              </button>
              {recovery && (
                <button
                  className="settings-chip"
                  onClick={() => {
                    setStatus('');
                    try {
                      const name = saveFileName(new Date(), 'recovery');
                      download(localStorage.getItem(SAVE_KEY) ?? '', name);
                      setError('');
                      setStatus(`Recovery copy exported as ${name}. Look for it with your downloads.`);
                    } catch {
                      setError('The original storage could not be accessed.');
                    }
                  }}
                >
                  Export recovery copy
                </button>
              )}
            </div>
            <input
              ref={input}
              aria-label="Import save file"
              className="file-input"
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setStatus('');
                if (file) {
                  try {
                    if (file.size > 2_000_000) throw new Error('It is too large to be a café export.');
                    const text = await file.text();
                    if (isNotebookFile(text))
                      throw new Error('It’s a routine notebook: import it from the Notebook on a shift.');
                    setPending({ save: parseSave(text, lessons), changes: migrationChanges(text, lessons) });
                    setError('');
                  } catch (err) {
                    setError(importProblem(file.name, err));
                  }
                }
                e.target.value = '';
              }}
            />
            {backup && (
              <div className="settings-backup">
                <div>
                  <p>
                    Kept from before {BEFORE[backup.reason]}, {when(backup.saved_at)}: {holds(backup.save) || FRESH}.
                  </p>
                  <Changes changes={backup.changes} lead="What the update changed:" />
                </div>
                <button className="settings-chip" onClick={() => setPending({ save: backup.save, kept: true })}>
                  <RotateCcw size={15} aria-hidden="true" /> Restore kept copy
                </button>
              </div>
            )}
            {/* Present before any export or import, so the confirmation is announced when it lands. */}
            <p className="settings-status" role="status">
              {status}
            </p>
            {(error || saveError) && (
              <p role="alert" className="error-text">
                {error || saveError}
              </p>
            )}
          </section>
          <section className="settings-block">
            <h3>
              <Leaf size={16} aria-hidden="true" /> A fresh start
            </h3>
            <p>
              Open the doors all over again. Progress and routines are cleared; these settings and your routine notebook
              stay.
            </p>
            <Button variant="outline-danger" className="settings-chip" aria-haspopup="dialog" onClick={onNew}>
              Start a new café
            </Button>
            <small>We’ll ask before clearing anything.</small>
          </section>
        </div>
        {updateReady && (
          <div className="settings-update">
            <p>
              A new version of the café is ready. It takes over once every tab of the café is closed
              {saveError || elsewhere
                ? '; progress isn’t being saved right now, so it waits until then.'
                : ', or now: your progress is kept, though a service under way starts over.'}
            </p>
            {!saveError && !elsewhere && (
              <button className="settings-chip" onClick={updateNow}>
                <RefreshCw size={15} aria-hidden="true" /> Update and reload
              </button>
            )}
          </div>
        )}
        <p className="settings-foot" aria-hidden="true">
          <span className="settings-barcode" />
          {saveError || elsewhere ? 'Not saving right now' : 'Saved as you go'} · Thank you, come again
        </p>
      </Modal>
      {pending && (
        <Modal
          className="settings-window confirm-slip"
          kicker={pending.kept ? 'The kept copy' : 'Import a café'}
          title="Replace this café?"
          onClose={() => setPending(null)}
        >
          <p>
            {pending.kept ? 'The kept copy' : 'This export'}{' '}
            {holds(pending.save) ? `holds ${holds(pending.save)}` : `is ${FRESH}`}.{' '}
            {pending.kept
              ? `Restoring it will replace your current progress, routines and settings${untouched(save) ? '' : ', and keep this café as the copy instead'}.`
              : 'Importing it will replace your current progress, routines and settings.'}
          </p>
          <Changes changes={pending.changes} lead="It was saved by an older version of the game, so:" />
          <div className="modal-buttons">
            <button className="settings-chip" data-autofocus onClick={() => setPending(null)}>
              Keep current café
            </button>
            <Button
              variant="danger"
              onClick={() => {
                if (pending.kept) restoreBackup();
                else importCafe(pending.save);
                setPending(null);
                setStatus(`Café ${pending.kept ? 'restored' : 'imported'}: ${holds(pending.save) || FRESH}.`);
              }}
            >
              {pending.kept ? 'Restore copy' : 'Replace café'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

const FRESH = 'a fresh café, with no shifts served yet';

/** What the kept copy was taken ahead of. */
const BEFORE: Record<BackupReason, string> = {
  import: 'your last import',
  reset: 'you started a new café',
  restore: 'you last restored a copy',
  migration: 'the game updated its save',
};

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

/** When the kept copy was taken, in the player's own date and time format. */
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** What an export holds, counted as the New café window counts what it clears; empty for a café never opened. */
function holds(save: ProgressSave): string {
  const done = Object.keys(save.stars).length;
  return done ? `${count(done, 'served shift')} and ${count(starTotal(save.stars), 'star')}` : '';
}

/** Why a chosen file was not imported, said in full, and that nothing was replaced. */
function importProblem(name: string, err: unknown): string {
  // Only the save checks' own errors are worded for players; anything else is just unreadable.
  const message = err instanceof Error && err.constructor === Error ? err.message : '';
  const why =
    err instanceof SyntaxError
      ? 'It isn’t a Caffeine Protocol café export.'
      : // The save checks name the exact field that failed; say that much, as damage.
        /^(Invalid|Missing) /.test(message)
        ? `Part of it is damaged: ${message.charAt(0).toLowerCase()}${message.slice(1)}`
        : message || 'It could not be read.';
  return `${name} wasn’t imported. ${why} Your current café has been kept.`;
}
