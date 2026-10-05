import { useState } from 'react';
import { Bug, Download, History } from 'lucide-react';
import { Modal } from '@/components';
import { download, saveFileName } from '@/shared/lib/download';
import { SettingRow, SHORT_REPEATS_HINT } from '@/shared/ui/SettingRow';

export interface OptionsModalProps {
  /** The robot whose tab is open, named on the reset button. */
  robot: string;
  pixelArt: boolean;
  textMode: boolean;
  observation: boolean;
  running: boolean;
  /** Whether any earlier version differs from the open routine; restoring one just like it would do nothing. */
  restorable: boolean;
  onTogglePixelArt: (value: boolean) => void;
  onToggleTextMode: (value: boolean) => void;
  shortRepeats: boolean;
  onToggleShortRepeats: (value: boolean) => void;
  /** The first-routine tips' switch, on the shift that has them; they go once the shift is served. */
  tips?: { on: boolean; onToggle: (value: boolean) => void };
  onRequestRestore: () => void;
  /** A problem report on this shift, its routines and its last run, built when the player asks to see it. */
  report: () => string;
  onClose: () => void;
}

/**
 * Workspace options: shader, text editor, shorter repeats, the first routine's tips, restoring an earlier version of
 * the open robot’s routine, and a problem report to save.
 */
export function OptionsModal({
  robot,
  pixelArt,
  textMode,
  observation,
  running,
  restorable,
  onTogglePixelArt,
  onToggleTextMode,
  shortRepeats,
  onToggleShortRepeats,
  tips,
  onRequestRestore,
  report,
  onClose,
}: OptionsModalProps) {
  // The report is shown in full before it's saved: the player sees everything the file holds.
  const [preview, setPreview] = useState<string>();
  const [status, setStatus] = useState('');
  // Says why restoring is greyed out, when nothing else in the window does.
  const note = observation
    ? 'This shift is watch-only: the crew serves by hand, so there’s no routine to edit or restore.'
    : !restorable
      ? `${robot}’s routine is just like every earlier version.`
      : running
        ? `Stop the service to restore ${robot}’s routine.`
        : '';
  return (
    <Modal className="settings-window confirm-slip" kicker="This shift" title="Workspace options" onClose={onClose}>
      <SettingRow
        title="Pixel-art shader"
        hint="Render the café with crisp pixels and outlined edges."
        checked={pixelArt}
        onChange={(e) => onTogglePixelArt(e.target.checked)}
      />
      <SettingRow
        title="Text editor"
        // A greyed-out switch says why in its own hint, which is what a screen reader reads with it.
        hint={
          observation
            ? 'Not on this shift: it’s watch-only, so there’s no routine to show.'
            : 'The same routine, in a plain-text view. Kept for every shift.'
        }
        checked={textMode}
        disabled={observation}
        onChange={(e) => onToggleTextMode(e.target.checked)}
      />
      <p>Comments and empty lines remain intact when switching views. Editing is locked during playback.</p>
      <SettingRow
        title="Shorter repeats"
        hint={SHORT_REPEATS_HINT}
        checked={shortRepeats}
        onChange={(e) => onToggleShortRepeats(e.target.checked)}
      />
      {tips && (
        <SettingRow
          title="First-routine tips"
          hint="Build, run, fix: one step at a time, under the routine, until the shift is served."
          checked={tips.on}
          onChange={(e) => tips.onToggle(e.target.checked)}
        />
      )}
      <button
        className="settings-chip"
        disabled={running || observation || !restorable}
        aria-describedby={note ? 'restore-note' : undefined}
        aria-haspopup="dialog"
        onClick={onRequestRestore}
      >
        <History size={15} aria-hidden="true" /> Restore {robot}’s routine
      </button>
      {note && <p id="restore-note">{note}</p>}
      <section className="options-report" aria-labelledby="options-report-title">
        <h3 id="options-report-title">Something wrong with the game?</h3>
        <p>
          A problem report holds this shift, your routines and your last run, so the problem can be played back. It’s
          saved as a file on this computer, and goes nowhere unless you share it.
        </p>
        {preview === undefined ? (
          <button
            className="settings-chip"
            onClick={() => {
              setPreview(report());
              setStatus('');
            }}
          >
            <Bug size={15} aria-hidden="true" /> Review a problem report
          </button>
        ) : (
          <>
            {/* Focusable, so the report can be scrolled and read from the keyboard. */}
            <pre className="options-report-preview" tabIndex={0} aria-label="Problem report, as it will be saved">
              {preview}
            </pre>
            <div className="settings-actions">
              <button
                className="settings-chip"
                onClick={() => {
                  const name = saveFileName(new Date(), 'report');
                  download(preview, name);
                  setPreview(undefined);
                  setStatus(`Report saved as ${name}. Look for it with your downloads.`);
                }}
              >
                <Download size={15} aria-hidden="true" /> Save report
              </button>
              <button className="settings-chip" onClick={() => setPreview(undefined)}>
                Not now
              </button>
            </div>
          </>
        )}
        <p className="settings-status" role="status">
          {status}
        </p>
      </section>
    </Modal>
  );
}
