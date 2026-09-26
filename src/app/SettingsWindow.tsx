import { useRef, useState } from 'react';
import { Download, FolderHeart, Leaf, Maximize, Sparkles, Upload, Volume2 } from 'lucide-react';
import { lessons } from '@/data';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { SettingRow } from '@/shared/ui/SettingRow';
import { SAVE_KEY, parseSave } from '@/features/campaign/save/persistence';
import type { ProgressSave } from '@/domain';
import { download } from '@/shared/lib/download';
import { useGame, useSettings } from '@/state/GameStore';

const volumes = [
  { key: 'volume', name: 'Master volume', label: 'Master volume' },
  { key: 'music', name: 'Music', label: 'Music volume' },
  { key: 'effects', name: 'Sound effects', label: 'Effects volume' },
] as const;

/** Café settings, printed on a slip of order paper that opens over whichever screen you're on. */
export function SettingsWindow({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const { save, recovery, saveError, importCafe } = useGame();
  const [pending, setPending] = useState<ProgressSave | null>(null),
    [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const [settings, setting] = useSettings();
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setting('fullscreen', false);
      } else {
        await document.documentElement.requestFullscreen();
        setting('fullscreen', true);
      }
    } catch {
      setError('Fullscreen is not available in this browser window.');
    }
  };
  return (
    <>
      <Modal
        className="settings-window"
        kicker="Café Niko · House settings"
        title="The little things."
        onClose={onClose}
        wide
      >
        <div className="settings-sheet">
          <section className="settings-block">
            <h3>
              <Volume2 size={16} /> Sound
            </h3>
            {volumes.map(({ key, name, label }) => (
              <label className="settings-volume" key={key}>
                <span>
                  {name}
                  <strong>{Math.round(settings[key] * 100)}%</strong>
                </span>
                <input
                  aria-label={label}
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={settings[key]}
                  onChange={(e) => setting(key, Number(e.target.value))}
                />
              </label>
            ))}
          </section>
          <section className="settings-block">
            <h3>
              <Sparkles size={16} /> Display & motion
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
            <div className="setting-row">
              <span>
                <strong>Fullscreen</strong>
                <small>A little more room for your café.</small>
              </span>
              <button className="settings-chip" onClick={() => void fullscreen()}>
                <Maximize size={15} /> Toggle
              </button>
            </div>
          </section>
          <section className="settings-block">
            <h3>
              <FolderHeart size={16} /> Your café, saved
            </h3>
            <p>Progress stays in this browser. Export a copy to keep it safe or carry it to another computer.</p>
            <div className="settings-actions">
              <button className="settings-chip" onClick={() => download(JSON.stringify(save, null, 2))}>
                <Download size={15} /> Export café
              </button>
              <button className="settings-chip" onClick={() => input.current?.click()}>
                <Upload size={15} /> Import café
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
                if (file) {
                  try {
                    if (file.size > 2_000_000) throw new Error('This file is too large.');
                    setPending(parseSave(await file.text(), lessons));
                    setError('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'This file could not be read.');
                  }
                }
                e.target.value = '';
              }}
            />
            {(error || saveError) && (
              <p role="alert" className="error-text">
                {error || saveError}
              </p>
            )}
          </section>
          <section className="settings-block">
            <h3>
              <Leaf size={16} /> A fresh start
            </h3>
            <p>Open the doors all over again. Progress and programs are cleared; these settings stay.</p>
            <Button variant="outline-danger" className="settings-chip" onClick={onNew}>
              Start a new café
            </Button>
            <small>We’ll ask before clearing anything.</small>
          </section>
        </div>
        <p className="settings-foot" aria-hidden="true">
          <span className="settings-barcode" />
          Saved as you go · Thank you, come again
        </p>
      </Modal>
      {pending && (
        <Modal title="Replace this café?" onClose={() => setPending(null)}>
          <p>
            This export contains {Object.keys(pending.stars).length} completed shifts and{' '}
            {Object.values(pending.stars).reduce((a, b) => a + b, 0)} stars. Importing it will replace your current
            progress, programs and settings.
          </p>
          <div className="modal-buttons">
            <button onClick={() => setPending(null)}>Keep current café</button>
            <Button
              variant="primary"
              onClick={() => {
                importCafe(pending);
                setPending(null);
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
