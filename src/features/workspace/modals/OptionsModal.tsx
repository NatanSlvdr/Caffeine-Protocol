import { RotateCcw } from 'lucide-react';
import { Modal } from '@/components';
import { SettingRow, SHORT_REPEATS_HINT } from '@/shared/ui/SettingRow';

export interface OptionsModalProps {
  /** The robot whose tab is open, named on the reset button. */
  robot: string;
  pixelArt: boolean;
  textMode: boolean;
  observation: boolean;
  running: boolean;
  /** Whether the open routine differs from how the shift opened it; a reset of an untouched one does nothing. */
  edited: boolean;
  onTogglePixelArt: (value: boolean) => void;
  onToggleTextMode: (value: boolean) => void;
  shortRepeats: boolean;
  onToggleShortRepeats: (value: boolean) => void;
  /** The first-routine tips' switch, on the shift that has them; they go once the shift is served. */
  tips?: { on: boolean; onToggle: (value: boolean) => void };
  onRequestReset: () => void;
  onClose: () => void;
}

/**
 * Workspace options: shader, text editor, shorter repeats, the first routine's tips, and resetting the open robot’s
 * routine.
 */
export function OptionsModal({
  robot,
  pixelArt,
  textMode,
  observation,
  running,
  edited,
  onTogglePixelArt,
  onToggleTextMode,
  shortRepeats,
  onToggleShortRepeats,
  tips,
  onRequestReset,
  onClose,
}: OptionsModalProps) {
  // Says why the reset is greyed out, when nothing else in the window does.
  const note = observation
    ? 'This shift is watch-only: the crew serves by hand, so there’s no routine to edit or reset.'
    : !edited
      ? `${robot}’s routine is just as the shift opened it.`
      : running
        ? `Stop the service to reset ${robot}’s routine.`
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
        disabled={running || observation || !edited}
        aria-describedby={note ? 'reset-note' : undefined}
        aria-haspopup="dialog"
        onClick={onRequestReset}
      >
        <RotateCcw size={15} aria-hidden="true" /> Reset {robot}’s routine
      </button>
      {note && <p id="reset-note">{note}</p>}
    </Modal>
  );
}
