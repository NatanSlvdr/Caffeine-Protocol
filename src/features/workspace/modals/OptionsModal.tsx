import { RotateCcw } from 'lucide-react';
import { Modal } from '@/components';
import { SettingRow } from '@/shared/ui/SettingRow';

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
      <SettingRow
        title="Pixel-art shader"
        hint="Render the café with crisp pixels and outlined edges."
        checked={pixelArt}
        onChange={(e) => onTogglePixelArt(e.target.checked)}
      />
      <SettingRow
        title="Text editor"
        hint="The same program, in a plain-text view."
        checked={textMode}
        disabled={observation}
        onChange={(e) => onToggleTextMode(e.target.checked)}
      />
      <p>Comments and empty lines remain intact when switching views. Editing is locked during playback.</p>
      <button disabled={running || observation} onClick={onRequestReset}>
        <RotateCcw size={15} /> Reset to incoming program
      </button>
    </Modal>
  );
}
