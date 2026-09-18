import { useRef, useState } from 'react';
import { ArrowLeft, Download, FolderHeart, Leaf, Maximize, Sparkles, Upload, Volume2 } from 'lucide-react';
import { lessons } from '@/data';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { SettingRow } from '@/shared/ui/SettingRow';
import { SAVE_KEY, parseSave } from '@/features/campaign/save/persistence';
import type { ProgressSave } from '@/domain';
import { go } from '@/shared/lib/navigation';
import { download } from '@/shared/lib/download';
import { useGame, useSettings } from '@/state/GameStore';

/** Café settings: sound, display, save import/export, and fresh starts. */
export function SettingsPage({ onNew }: { onNew: () => void }) {
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
    <main className="settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>The little things.</h1>
          <p>A café that feels right for you.</p>
        </div>
        <button onClick={() => go('/campaign')}>
          <ArrowLeft size={15} /> Back to campaign
        </button>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h2>
            <Volume2 size={19} /> Sound & atmosphere
          </h2>
          {(['volume', 'music', 'effects'] as const).map((key) => (
            <label className="volume-setting" key={key}>
              <span>
                {key === 'volume' ? 'Master volume' : key === 'music' ? 'Music' : 'Sound effects'}
                <strong>{Math.round(settings[key] * 100)}%</strong>
              </span>
              <input
                aria-label={key === 'volume' ? 'Master volume' : key === 'music' ? 'Music volume' : 'Effects volume'}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={settings[key]}
                onChange={(e) => setting(key, Number(e.target.value))}
              />
            </label>
          ))}
          <p className="muted">A familiar soundtrack, a gentle click, a freshly served cup.</p>
        </section>
        <section className="settings-card">
          <h2>
            <Sparkles size={19} /> Display & movement
          </h2>
          <SettingRow
            title="Reduced motion"
            hint="Keep the movement, skip the extra animation."
            checked={settings.reduced_motion}
            onChange={(e) => setting('reduced_motion', e.target.checked)}
          />
          <SettingRow
            title="Pixel-art shader"
            hint="Render the café with crisp pixels and outlined edges."
            checked={settings.pixel_art}
            onChange={(e) => setting('pixel_art', e.target.checked)}
          />
          <div className="setting-row">
            <span>
              <strong>Fullscreen</strong>
              <small>A little more room for your café.</small>
            </span>
            <button onClick={() => void fullscreen()}>
              <Maximize size={17} /> Toggle
            </button>
          </div>
          <p className="muted">Designed for a mouse, a keyboard, and a desktop window at least 1100 pixels wide.</p>
        </section>
        <section className="settings-card">
          <h2>
            <FolderHeart size={19} /> Your café, saved
          </h2>
          <p>Your progress stays in this browser. Export a copy to keep it safe or move to another computer.</p>
          <div className="button-row">
            <button onClick={() => download(JSON.stringify(save, null, 2))}>
              <Download size={16} /> Export café
            </button>
            <button onClick={() => input.current?.click()}>
              <Upload size={16} /> Import café
            </button>
            {recovery && (
              <button
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
        <section className="settings-card fresh-start">
          <h2>
            <Leaf size={19} /> A fresh start
          </h2>
          <p>Open the doors all over again. Clear campaign progress and programs while keeping your settings.</p>
          <Button variant="outline-danger" onClick={onNew}>
            Start a new café
          </Button>
          <small>We’ll ask before clearing anything.</small>
        </section>
      </div>
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
    </main>
  );
}
