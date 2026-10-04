import { useEffect, useRef, useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { reclaimFocus } from '@/shared/lib/focus';
import { openSettings } from '@/shared/lib/navigation';
import { useGame } from '@/state/GameStore';

/** A save problem pinned over every screen, so progress never goes quietly unsaved. */
export function SaveNotice() {
  const { saveError, elsewhere, loadElsewhere, keepThisTab } = useGame();
  // Dismissing hides this message only: a different problem later shows again.
  const [dismissed, setDismissed] = useState('');
  // The Dismiss button goes with the notice, so focus carries on from the screen's title, not the top of the page.
  useEffect(() => {
    if (dismissed) reclaimFocus();
  }, [dismissed]);
  // Keeping this tab's progress takes the other-tab notice away with the focused button, so the same goes for it.
  const shown = useRef(false);
  useEffect(() => {
    if (elsewhere) shown.current = true;
    else if (shown.current) {
      shown.current = false;
      reclaimFocus();
    }
  }, [elsewhere]);
  // Nothing is being saved until the player chooses, so this one can't be dismissed.
  if (elsewhere)
    return (
      <div className="save-notice" role="alert">
        <TriangleAlert size={18} aria-hidden="true" />
        <p>
          This café was just saved from another tab or window. This one has stopped saving, so neither overwrites the
          other.
        </p>
        <button className="save-notice-open" onClick={loadElsewhere}>
          Load the newer progress
        </button>
        <button className="save-notice-keep" onClick={keepThisTab}>
          Keep this tab’s progress
        </button>
      </div>
    );
  if (!saveError || saveError === dismissed) return null;
  return (
    <div className="save-notice" role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <p>{saveError}</p>
      <button className="save-notice-open" aria-haspopup="dialog" onClick={openSettings}>
        Open settings
      </button>
      <button
        className="save-notice-close"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => setDismissed(saveError)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
