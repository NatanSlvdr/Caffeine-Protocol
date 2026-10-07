import { useState } from 'react';
import { Bug, Download, GitCompareArrows, History } from 'lucide-react';
import { Modal } from '@/components';
import { download, saveFileName } from '@/shared/lib/download';
import { SettingRow, SHORT_REPEATS } from '@/shared/ui/SettingRow';
import { useLanguage, useWords } from '@/shared/language';
import { OPTIONS_WORDS } from './optionsWords';

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
  /** Set two runs of the same rounds side by side; nothing until this visit has two. */
  onCompare?: () => void;
  /** A problem report on this shift, its routines and its last run, built when the player asks to see it. */
  report: () => string;
  onClose: () => void;
}

/**
 * Workspace options: shader, text editor, shorter repeats, the first routine's tips, restoring an earlier version of
 * the open robot’s routine, comparing two runs, and a problem report to save.
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
  onCompare,
  report,
  onClose,
}: OptionsModalProps) {
  const say = useWords(OPTIONS_WORDS);
  const repeats = SHORT_REPEATS[useLanguage()[0]];
  // The report is shown in full before it's saved: the player sees everything the file holds.
  const [preview, setPreview] = useState<string>();
  const [status, setStatus] = useState('');
  // Says why restoring is greyed out, when nothing else in the window does.
  const why = observation ? 'observation' : !restorable ? 'same' : running ? 'running' : undefined;
  const note = why && say.restoreNote(robot, why);
  return (
    <Modal className="settings-window confirm-slip" kicker={say.kicker} title={say.title} onClose={onClose}>
      <SettingRow
        title={say.pixelArt}
        hint={say.pixelArtHint}
        checked={pixelArt}
        onChange={(e) => onTogglePixelArt(e.target.checked)}
      />
      <SettingRow
        title={say.textEditor}
        hint={say.textEditorHint(observation)}
        checked={textMode}
        disabled={observation}
        onChange={(e) => onToggleTextMode(e.target.checked)}
      />
      <p>{say.views}</p>
      <SettingRow
        title={repeats.title}
        hint={repeats.hint}
        checked={shortRepeats}
        onChange={(e) => onToggleShortRepeats(e.target.checked)}
      />
      {tips && (
        <SettingRow
          title={say.tips}
          hint={say.tipsHint}
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
        <History size={15} aria-hidden="true" /> {say.restore(robot)}
      </button>
      {note && <p id="restore-note">{note}</p>}
      {!observation && (
        <>
          <button
            className="settings-chip"
            disabled={!onCompare}
            aria-describedby={onCompare ? undefined : 'compare-note'}
            aria-haspopup="dialog"
            onClick={onCompare}
          >
            <GitCompareArrows size={15} aria-hidden="true" /> {say.compare}
          </button>
          {!onCompare && <p id="compare-note">{say.compareNote}</p>}
        </>
      )}
      <section className="options-report" aria-labelledby="options-report-title">
        <h3 id="options-report-title">{say.report}</h3>
        <p>{say.reportText}</p>
        {preview === undefined ? (
          <button
            className="settings-chip"
            onClick={() => {
              setPreview(report());
              setStatus('');
            }}
          >
            <Bug size={15} aria-hidden="true" /> {say.review}
          </button>
        ) : (
          <>
            {/* Focusable, so the report can be scrolled and read from the keyboard. */}
            <pre className="options-report-preview" tabIndex={0} aria-label={say.preview}>
              {preview}
            </pre>
            <div className="settings-actions">
              <button
                className="settings-chip"
                onClick={() => {
                  const name = saveFileName(new Date(), 'report');
                  download(preview, name);
                  setPreview(undefined);
                  setStatus(say.saved(name));
                }}
              >
                <Download size={15} aria-hidden="true" /> {say.save}
              </button>
              <button className="settings-chip" onClick={() => setPreview(undefined)}>
                {say.notNow}
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
