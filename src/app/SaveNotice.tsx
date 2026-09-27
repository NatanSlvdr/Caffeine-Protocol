import { useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { openSettings } from '@/shared/lib/navigation';
import { useGame } from '@/state/GameStore';

/** A save problem pinned over every screen, so progress never goes quietly unsaved. */
export function SaveNotice() {
  const { saveError } = useGame();
  // Dismissing hides this message only: a different problem later shows again.
  const [dismissed, setDismissed] = useState('');
  if (!saveError || saveError === dismissed) return null;
  return (
    <div className="save-notice" role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <p>{saveError}</p>
      <button className="save-notice-open" onClick={openSettings}>
        Open settings
      </button>
      <button
        className="save-notice-close"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => setDismissed(saveError)}
      >
        <X size={16} />
      </button>
    </div>
  );
}
