import { RotateCcw } from 'lucide-react';
import { Modal } from '@/components';

export interface OptionsModalProps {
  pixelArt: boolean;
  textMode: boolean;
  observation: boolean;
  running: boolean;
  onTogglePixelArt: (value: boolean) => void;
  onToggleTextMode: (value: boolean) => void;
  onRequestReset: () => void;
  onClose: () => void;
}

/** Workspace options: shader, text editor, and routine reset. */
export function OptionsModal({
  pixelArt,
  textMode,
  observation,
  running,
  onTogglePixelArt,
  onToggleTextMode,
  onRequestReset,
  onClose,
}: OptionsModalProps) {
  return (
    <Modal title="Workspace options" onClose={onClose}>
      <label className="setting-row">
        <span>
          <strong>Pixel-art shader</strong>
          <small>Render the café with crisp pixels and outlined edges.</small>
        </span>
        <input type="checkbox" checked={pixelArt} onChange={(e) => onTogglePixelArt(e.target.checked)} />
      </label>
      <label className="setting-row">
        <span>
          <strong>Text editor</strong>
          <small>The same program, in a plain-text view.</small>
        </span>
        <input type="checkbox" checked={textMode} disabled={observation} onChange={(e) => onToggleTextMode(e.target.checked)} />
      </label>
      <p>Comments and empty lines remain intact when switching views. Editing is locked during playback.</p>
      <button disabled={running || observation} onClick={onRequestReset}>
        <RotateCcw size={15} /> Reset to incoming program
      </button>
    </Modal>
  );
}
