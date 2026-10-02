import { useEffect, useRef, useState } from 'react';
import { Download, FolderHeart, Leaf, Maximize, Minimize, Sparkles, Upload, Volume2 } from 'lucide-react';
import { lessons } from '@/data';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { SettingRow } from '@/shared/ui/SettingRow';
import { SAVE_KEY, parseSave } from '@/features/campaign/save/persistence';
import { count, type ProgressSave } from '@/domain';
import { download, saveFileName } from '@/shared/lib/download';
import { starTotal, useCafeName, useGame, useSettings } from '@/state/GameStore';

/** Café settings, printed on a slip of order paper that opens over whichever screen you're on. */
export function SettingsWindow({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const { save, recovery, saveError, importCafe } = useGame();
  const cafe = useCafeName();
  const [pending, setPending] = useState<ProgressSave | null>(null),
    [error, setError] = useState(''),
    [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const [settings, setting] = useSettings();
  // Track the browser's own state, so leaving with Esc relabels the button too.
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  // Some tablet browsers, and a café saved to the home screen, can't go fullscreen; offer it only where it works.
  const canFullscreen = !!document.fullscreenEnabled;
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError('This browser window didn’t go fullscreen. Try again, or use the browser’s own menu.');
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
            <SettingRow
              title="Reduced motion"
              hint="Keep the movement, skip the extra animation."
              checked={settings.reduced_motion}
              onChange={(e) => setting('reduced_motion', e.target.checked)}
            />
            <SettingRow
              title="Pixel-art shader"
              hint="Crisp pixels and outlined edges."
              checked={settings.pixel_art}
              onChange={(e) => setting('pixel_art', e.target.checked)}
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
                    try {
                      download(localStorage.getItem(SAVE_KEY) ?? '', 'caffeine-recovery.json');
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
                    setPending(parseSave(await file.text(), lessons));
                    setError('');
                  } catch (err) {
                    setError(importProblem(file.name, err));
                  }
                }
                e.target.value = '';
              }}
            />
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
            <p>Open the doors all over again. Progress and routines are cleared; these settings stay.</p>
            <Button variant="outline-danger" className="settings-chip" onClick={onNew}>
              Start a new café
            </Button>
            <small>We’ll ask before clearing anything.</small>
          </section>
        </div>
        <p className="settings-foot" aria-hidden="true">
          <span className="settings-barcode" />
          {saveError ? 'Not saving right now' : 'Saved as you go'} · Thank you, come again
        </p>
      </Modal>
      {pending && (
        <Modal
          className="settings-window confirm-slip"
          kicker="Import a café"
          title="Replace this café?"
          onClose={() => setPending(null)}
        >
          <p>
            This export contains {count(Object.keys(pending.stars).length, 'completed shift')} and{' '}
            {count(starTotal(pending.stars), 'star')}. Importing it will replace your current progress, routines and
            settings.
          </p>
          <div className="modal-buttons">
            <button className="settings-chip" data-autofocus onClick={() => setPending(null)}>
              Keep current café
            </button>
            <Button
              variant="danger"
              onClick={() => {
                importCafe(pending);
                setPending(null);
                setStatus(
                  `Café imported: ${count(Object.keys(pending.stars).length, 'completed shift')} and ${count(starTotal(pending.stars), 'star')}.`,
                );
              }}
            >
              Replace café
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
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
