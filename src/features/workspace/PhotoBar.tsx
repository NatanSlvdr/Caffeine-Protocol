import { useEffect, useRef } from 'react';
import { Camera, Download, X } from 'lucide-react';
import { PHOTO_VIEWS, type PhotoView } from './photo';

/** Photo mode's controls, in the playback strip's place: the framing, the shutter, and the way back. */
export function PhotoBar({
  view,
  onView,
  onSave,
  onDone,
  developing,
  said,
}: {
  view: PhotoView;
  onView: (view: PhotoView) => void;
  onSave: () => void;
  onDone: () => void;
  /** A photo is being taken and printed. */
  developing: boolean;
  /** What became of the last photo. */
  said: string;
}) {
  const shutter = useRef<HTMLButtonElement>(null);
  // The button that opened photo mode is put away with the rest: focus goes to the shutter.
  useEffect(() => shutter.current?.focus(), []);
  return (
    <div className="photo-bar" role="group" aria-label="Photo mode">
      <span className="photo-kicker" aria-hidden="true">
        <Camera size={15} />
        Photo
      </span>
      <div className="photo-views" role="group" aria-label="Framing">
        {PHOTO_VIEWS.map((option) => (
          <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => onView(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      <button ref={shutter} type="button" className="primary photo-save" disabled={developing} onClick={onSave}>
        <Download size={15} aria-hidden="true" />
        {developing ? 'Saving…' : 'Save photo'}
      </button>
      <button type="button" className="photo-done" aria-keyshortcuts="Escape" onClick={onDone}>
        <X size={15} aria-hidden="true" />
        Done
        <kbd aria-hidden="true">Esc</kbd>
      </button>
      <p className="photo-said" role="status">
        {said}
      </p>
    </div>
  );
}
