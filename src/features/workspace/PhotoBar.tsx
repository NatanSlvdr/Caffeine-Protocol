import { useEffect, useRef } from 'react';
import { Camera, Download, X } from 'lucide-react';
import { useWords } from '@/shared/language';
import { PHOTO_VIEWS, type PhotoView } from './photo';
import { WORKSPACE_WORDS } from './workspaceWords';

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
  const words = useWords(WORKSPACE_WORDS),
    say = words.photoBar;
  const shutter = useRef<HTMLButtonElement>(null);
  // The button that opened photo mode is put away with the rest: focus goes to the shutter.
  useEffect(() => shutter.current?.focus(), []);
  return (
    <div className="photo-bar" role="group" aria-label={words.photoMode}>
      <span className="photo-kicker" aria-hidden="true">
        <Camera size={15} />
        {words.photo}
      </span>
      <div className="photo-views" role="group" aria-label={say.framing}>
        {PHOTO_VIEWS.map((option) => (
          <button key={option} type="button" aria-pressed={view === option} onClick={() => onView(option)}>
            {say.views[option]}
          </button>
        ))}
      </div>
      <button ref={shutter} type="button" className="primary photo-save" disabled={developing} onClick={onSave}>
        <Download size={15} aria-hidden="true" />
        {developing ? say.saving : say.save}
      </button>
      <button type="button" className="photo-done" aria-keyshortcuts="Escape" onClick={onDone}>
        <X size={15} aria-hidden="true" />
        {say.done}
        <kbd aria-hidden="true">{say.escape}</kbd>
      </button>
      <p className="photo-said" role="status">
        {said}
      </p>
    </div>
  );
}
